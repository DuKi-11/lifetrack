import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISODate } from '../api.js'
import { useAuth } from '../auth.jsx'
import { tint } from '../habitMeta.js'
import Icon from './Icon.jsx'

/** Loads data with fn() whenever deps change. */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  const setData = (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  return { ...state, setData }
}

export function ProgressRing({ value, size = 84, stroke = 9, color = '#fff', track = 'rgba(255,255,255,.25)', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" role="img" aria-label={`${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .5s ease' }} />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700">
        {label ?? `${pct}%`}
      </text>
    </svg>
  )
}

export function HabitIcon({ habit, size = 42 }) {
  return (
    <div className="habit-icon" style={{ background: tint(habit.color), color: habit.color, width: size, height: size }}>
      {habit.name.trim()[0]?.toUpperCase()}
    </div>
  )
}

/** One habit with a check button. */
export function HabitRow({ habit, onToggle, busy }) {
  return (
    <div className={`habit-row ${habit.doneToday ? 'done' : ''}`}>
      <HabitIcon habit={habit} />
      <div className="habit-text">
        <div className="habit-name">{habit.name}</div>
        <div className="muted small">
          {[habit.goal, habit.streak > 0 && `${habit.streak}-day streak`].filter(Boolean).join(' · ') || 'Tap to check off'}
        </div>
      </div>
      <button className={`check ${habit.doneToday ? 'on' : ''}`} onClick={() => onToggle(habit)} disabled={busy}
        aria-label={habit.doneToday ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`} aria-pressed={habit.doneToday}>
        {habit.doneToday && <Icon name="check" size={16} stroke={3} />}
      </button>
    </div>
  )
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Bar chart of completion % per day. */
export function WeekBars({ days, height = 150 }) {
  const todayIdx = days.length - 1
  return (
    <div className="week-bars" style={{ height: height + 28 }}>
      {days.map((d, i) => {
        const pct = d.total ? Math.round((100 * d.completed) / d.total) : 0
        const date = parseISODate(d.date)
        return (
          <div key={d.date} className={`bar-col ${i === todayIdx ? 'today' : ''}`}
            title={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${d.completed}/${d.total} (${pct}%)`}>
            <div className="bar-track" style={{ height }}>
              <div className="bar" style={{ height: `${Math.max(pct, 4)}%` }}>
                {pct > 0 && <span className="bar-val">{pct}%</span>}
              </div>
            </div>
            <span className="bar-label">{DAY_LETTERS[date.getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** A short sentence about the week, based on real numbers. */
export function insightFor(weekly) {
  if (!weekly) return null
  const { days, completionRate, previousRate } = weekly
  if (!days.length || days[0].total === 0) return 'Add your first habit to start seeing weekly insights.'
  const best = days.reduce((a, b) => (b.completed > a.completed ? b : a), days[0])
  if (best.completed === 0) return 'No check-ins yet this week. One small habit today is a great start.'
  const bestName = parseISODate(best.date).toLocaleDateString(undefined, { weekday: 'long' })
  const moodDays = days.filter((d) => d.mood != null)
  if (moodDays.length >= 3) {
    const happy = moodDays.filter((d) => d.mood >= 4)
    const low = moodDays.filter((d) => d.mood <= 3)
    if (happy.length && low.length) {
      const avg = (arr) => arr.reduce((s, d) => s + (d.total ? d.completed / d.total : 0), 0) / arr.length
      const diff = Math.round((avg(happy) - avg(low)) * 100)
      if (diff >= 10) return `On days you felt good, you completed ${diff}% more of your habits.`
    }
  }
  if (completionRate > previousRate) return `You're up ${completionRate - previousRate}% on last week. ${bestName} was your best day.`
  return `${bestName} was your best day this week, with ${best.completed} of ${best.total} habits done.`
}

export function InsightCard({ text }) {
  if (!text) return null
  return (
    <div className="insight">
      <div className="insight-icon"><Icon name="sparkle" size={18} /></div>
      <div>
        <div className="insight-title">Weekly insight</div>
        <p>{text}</p>
      </div>
    </div>
  )
}

export function EmptyHabits({ onNew }) {
  return (
    <div className="empty card">
      <div className="empty-icon"><Icon name="target" size={28} /></div>
      <h3>No habits yet</h3>
      <p className="muted">Start with one small thing you want to do every day.</p>
      <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={18} /> Create your first habit</button>
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <div className="alert">{error.message}</div>
}

export function PageHeader({ eyebrow, title, children }) {
  const { user } = useAuth()
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="page-actions">
        {children}
        <span className="mobile-only"><AvatarLink user={user} /></span>
      </div>
    </header>
  )
}

export function AvatarLink({ user }) {
  return (
    <Link to="/me" className="avatar" aria-label="Profile">
      {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.name || '?').trim()[0]?.toUpperCase()}
    </Link>
  )
}
