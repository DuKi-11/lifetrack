import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, toISODate } from '../api.js'
import { useAuth } from '../auth.jsx'
import { MOODS, moodLabel, streakTier } from '../habitMeta.js'
import FireIcon from '../components/FireIcon.jsx'
import Icon from '../components/Icon.jsx'
import MoodCard from '../components/MoodCard.jsx'
import {
  AvatarLink, EmptyHabits, ErrorNote, HabitRow, InsightCard, ProgressRing, WeekBars, insightFor, useLoad,
} from '../components/Widgets.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { user } = useAuth()
  const { version, refresh, openNewHabit } = useOutletContext()
  const today = toISODate()
  const [busyId, setBusyId] = useState(null)

  const habits = useLoad(() => api.habits(today), [today, version])
  const weekly = useLoad(() => api.weekly(today), [today, version])
  const summary = useLoad(() => api.summary(today), [today, version])
  const mood = useLoad(() => api.moods(today, today).then((list) => list[0] || null), [today])

  const list = habits.data || []
  const done = list.filter((h) => h.doneToday).length
  const pct = list.length ? Math.round((100 * done) / list.length) : 0
  const streak = summary.data?.currentStreak ?? 0
  const tier = streakTier(streak)
  const todayMood = mood.data?.score

  async function toggle(habit) {
    setBusyId(habit.id)
    try {
      const updated = await api.toggleHabit(today, habit.id)
      habits.setData((hs) => hs.map((h) => (h.id === updated.id ? updated : h)))
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          <h1>{greeting()}, {firstName}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary hide-mobile" onClick={openNewHabit}><Icon name="plus" size={18} /> New habit</button>
          <AvatarLink user={user} />
        </div>
      </header>

      <ErrorNote error={habits.error} />

      <div className="home-top">
        <section className={`progress-card tier-${tier.level}`}>
          <div>
            <div className="pc-label">Today's progress</div>
            <div className="pc-value">
              {list.length ? `${done} of ${list.length} ${list.length === 1 ? 'habit' : 'habits'} done` : 'No habits yet'}
            </div>
            <div className="pc-pill"><Icon name="flame" size={14} /> {streak}-day streak</div>
            <div className="pc-next">
              {tier.next
                ? `${tier.daysToNext} more ${tier.daysToNext === 1 ? 'day' : 'days'} to turn ${tier.next.name}`
                : 'Top level reached. You are Eternal!'}
            </div>
          </div>
          <ProgressRing value={pct} />
        </section>

        <div className="tiles">
          <div className="tile">
            <div className={`tile-icon ${streak > 0 ? 'on-fire' : ''}`} style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}><FireIcon streak={streak} /></div>
            <div className="tile-label">Streak</div>
            <div className="tile-value">{streak} {streak === 1 ? 'day' : 'days'}</div>
            <div className="tile-sub">best {summary.data?.longestStreak ?? 0}</div>
          </div>
          <div className="tile">
            <div className="tile-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Icon name="stats" size={18} /></div>
            <div className="tile-label">This week</div>
            <div className="tile-value">{weekly.data?.completionRate ?? 0}%</div>
            <div className="tile-sub">{weekly.data?.checkIns ?? 0} {weekly.data?.checkIns === 1 ? 'check-in' : 'check-ins'}</div>
          </div>
          <div className="tile">
            <div className="tile-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
              {todayMood ? <span style={{ fontSize: 17 }}>{MOODS[todayMood - 1].emoji}</span> : <Icon name="sparkle" size={18} />}
            </div>
            <div className="tile-label">Mood</div>
            <div className="tile-value">{moodLabel(todayMood)}</div>
            <div className="tile-sub">avg {weekly.data?.averageMood ?? '—'} this week</div>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="col">
          <div className="section-head">
            <h2>Today's habits</h2>
            <Link to="/habits">See all</Link>
          </div>
          {habits.loading && !habits.data ? (
            <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
          ) : list.length === 0 ? (
            <EmptyHabits onNew={openNewHabit} />
          ) : (
            <div className="habit-list">
              {list.map((h) => <HabitRow key={h.id} habit={h} onToggle={toggle} busy={busyId === h.id} />)}
            </div>
          )}
        </div>

        <div className="col">
          {!mood.loading && (
            <MoodCard date={today} entry={mood.data} onSaved={(saved) => { mood.setData(saved); refresh() }} />
          )}
          {weekly.data && (
            <section className="card">
              <div className="card-head">
                <h2>This week</h2>
                <Link to="/stats" className="small">Details</Link>
              </div>
              <WeekBars days={weekly.data.days} height={110} />
            </section>
          )}
          <InsightCard text={insightFor(weekly.data)} />
        </div>
      </div>
    </div>
  )
}
