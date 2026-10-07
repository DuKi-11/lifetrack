import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, api, parseISODate, toISODate } from '../api.js'
import { CATEGORIES } from '../habitMeta.js'
import Icon from '../components/Icon.jsx'
import { EmptyHabits, ErrorNote, HabitIcon, PageHeader, useLoad } from '../components/Widgets.jsx'

export default function Habits() {
  const { version, refresh, openNewHabit, editHabit } = useOutletContext()
  const todayISO = toISODate()
  const [selected, setSelected] = useState(todayISO)
  // Which 7-day window is shown: 0 = the week ending today, 1 = the week before, ...
  const [weekOffset, setWeekOffset] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)

  const habits = useLoad(() => api.habits(selected), [selected, version])

  const windowEnd = addDays(new Date(), -7 * weekOffset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(windowEnd, i - 6))
  const selectedDate = parseISODate(selected)

  const list = (habits.data || []).filter((h) => filter === 'ALL' || h.category === filter)
  const usedCategories = new Set((habits.data || []).map((h) => h.category))

  async function toggle(habit) {
    setBusyId(habit.id)
    try {
      const updated = await api.toggleHabit(selected, habit.id)
      habits.setData((hs) => hs.map((h) => (h.id === updated.id ? updated : h)))
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  function shiftWeek(delta) {
    const next = Math.max(0, weekOffset + delta)
    setWeekOffset(next)
    setSelected(toISODate(addDays(new Date(), -7 * next)))
  }

  return (
    <div className="page">
      <PageHeader eyebrow={selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} title="My Habits">
        <button className="btn btn-primary" onClick={openNewHabit}><Icon name="plus" size={18} /> New</button>
      </PageHeader>

      <div className="week-picker card">
        <button className="icon-btn" onClick={() => shiftWeek(1)} aria-label="Previous week"><Icon name="chevronLeft" /></button>
        <div className="week-days">
          {days.map((d) => {
            const iso = toISODate(d)
            return (
              <button key={iso} className={`day ${iso === selected ? 'active' : ''} ${iso === todayISO ? 'is-today' : ''}`}
                onClick={() => setSelected(iso)} aria-pressed={iso === selected}>
                <span className="day-name">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="day-num">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
        <button className="icon-btn" onClick={() => shiftWeek(-1)} disabled={weekOffset === 0} aria-label="Next week">
          <Icon name="chevronRight" />
        </button>
      </div>

      {(habits.data || []).length > 0 && (
        <div className="chips scroll-x">
          <button className={`chip ${filter === 'ALL' ? 'active dark' : ''}`} onClick={() => setFilter('ALL')}>All</button>
          {CATEGORIES.filter((c) => usedCategories.has(c.value)).map((c) => (
            <button key={c.value} className={`chip ${filter === c.value ? 'active dark' : ''}`} onClick={() => setFilter(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <ErrorNote error={habits.error} />

      {selected !== todayISO && (
        <p className="muted small past-note">
          <Icon name="calendar" size={14} /> Editing {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.
          {' '}<button className="link-btn" onClick={() => { setWeekOffset(0); setSelected(todayISO) }}>Back to today</button>
        </p>
      )}

      {habits.loading && !habits.data ? (
        <div className="habit-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton tall" />)}</div>
      ) : (habits.data || []).length === 0 ? (
        <EmptyHabits onNew={openNewHabit} />
      ) : (
        <div className="habit-grid">
          {list.map((h) => {
            const weekDone = h.last7.filter(Boolean).length
            return (
              <article key={h.id} className={`habit-card ${h.doneToday ? 'done' : ''}`}>
                <div className="habit-card-top">
                  <HabitIcon habit={h} size={40} />
                  <div className="habit-text">
                    <div className="habit-name">{h.name}</div>
                    <div className="muted small">{h.goal || CATEGORIES.find((c) => c.value === h.category)?.label}</div>
                  </div>
                  <button className="icon-btn subtle" onClick={() => editHabit(h)} aria-label={`Edit ${h.name}`}>
                    <Icon name="edit" size={18} />
                  </button>
                  <button className={`check ${h.doneToday ? 'on' : ''}`} onClick={() => toggle(h)} disabled={busyId === h.id}
                    aria-label={h.doneToday ? `Mark ${h.name} not done` : `Mark ${h.name} done`} aria-pressed={h.doneToday}>
                    {h.doneToday && <Icon name="check" size={16} stroke={3} />}
                  </button>
                </div>
                <div className="habit-card-meta">
                  <div className="dots" aria-label={`Done ${weekDone} of the last 7 days`}>
                    {h.last7.map((d, i) => <i key={i} style={d ? { background: h.color } : undefined} />)}
                  </div>
                  <span className="small muted">
                    {weekDone}/7 days{h.streak > 0 && <> · <Icon name="flame" size={12} /> {h.streak}</>}
                  </span>
                </div>
                <div className="progress"><div style={{ width: `${(weekDone / 7) * 100}%`, background: h.color }} /></div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
