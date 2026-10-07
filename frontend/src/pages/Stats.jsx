import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, api, parseISODate, toISODate } from '../api.js'
import { MOODS, moodLabel } from '../habitMeta.js'
import Icon from '../components/Icon.jsx'
import { ErrorNote, InsightCard, PageHeader, WeekBars, insightFor, useLoad } from '../components/Widgets.jsx'

function rangeLabel(days) {
  if (!days?.length) return ''
  const f = (s) => parseISODate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${f(days[0].date)} – ${f(days[days.length - 1].date)}`
}

export default function Stats() {
  const { version } = useOutletContext()
  const [weekOffset, setWeekOffset] = useState(0)
  const end = toISODate(addDays(new Date(), -7 * weekOffset))
  const weekly = useLoad(() => api.weekly(end), [end, version])
  const moods = useLoad(() => api.moods(toISODate(addDays(parseISODate(end), -6)), end), [end, version])

  const w = weekly.data
  const diff = w ? w.completionRate - w.previousRate : 0

  return (
    <div className="page">
      <PageHeader eyebrow="Your progress" title="Statistics">
        <div className="segmented">
          <button className="icon-btn" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Previous week"><Icon name="chevronLeft" /></button>
          <span className="segmented-label">{weekOffset === 0 ? 'This week' : rangeLabel(w?.days)}</span>
          <button className="icon-btn" onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={weekOffset === 0} aria-label="Next week">
            <Icon name="chevronRight" />
          </button>
        </div>
      </PageHeader>

      <ErrorNote error={weekly.error} />

      {w && (
        <div className="stats-grid">
          <div className="col">
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <div className="muted small">Habit completion · {rangeLabel(w.days)}</div>
                <div className="big-number">{w.completionRate}%</div>
              </div>
              {(w.completionRate > 0 || w.previousRate > 0) && (
                <span className={`trend ${diff >= 0 ? 'up' : 'down'}`}>
                  {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)}% vs previous week
                </span>
              )}
            </div>
            <WeekBars days={w.days} height={180} />
          </section>
          <InsightCard text={insightFor(w)} />
          </div>
          <div className="col">

          <div className="metric-row">
            <div className="metric" style={{ background: 'var(--orange-soft)' }}>
              <span className="metric-label" style={{ color: 'var(--orange)' }}>Avg. mood</span>
              <span className="metric-value">{moodLabel(w.averageMood)}</span>
              <span className="metric-sub">{w.averageMood ? `${w.averageMood} / 5` : 'No moods logged'}</span>
            </div>
            <div className="metric" style={{ background: 'var(--primary-soft)' }}>
              <span className="metric-label" style={{ color: 'var(--primary)' }}>Check-ins</span>
              <span className="metric-value">{w.checkIns}</span>
              <span className="metric-sub">in 7 days</span>
            </div>
          </div>

          <section className="card">
            <div className="card-head"><h2>Mood this week</h2></div>
            <div className="mood-week">
              {w.days.map((d) => {
                const m = d.mood ? MOODS[d.mood - 1] : null
                const note = (moods.data || []).find((x) => x.date === d.date)?.note
                return (
                  <div key={d.date} className="mood-day" title={note || ''}>
                    <span className={`mood-dot ${m ? '' : 'none'}`}>{m ? m.emoji : null}</span>
                    <span className="small muted">{parseISODate(d.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  </div>
                )
              })}
            </div>
            {(moods.data || []).filter((m) => m.note).slice(-3).reverse().map((m) => (
              <div key={m.date} className="note-line">
                <span>{MOODS[m.score - 1].emoji}</span>
                <p>{m.note}</p>
                <small className="muted">{parseISODate(m.date).toLocaleDateString(undefined, { weekday: 'short' })}</small>
              </div>
            ))}
          </section>
          </div>
        </div>
      )}
    </div>
  )
}
