import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, api, parseISODate, toISODate } from '../api.js'
import { useAuth } from '../auth.jsx'
import { initials } from '../habitMeta.js'
import Icon from '../components/Icon.jsx'
import Crown from '../components/Crown.jsx'
import RewardsCard from '../components/RewardsCard.jsx'
import EditProfileModal from '../components/EditProfileModal.jsx'
import { PageHeader, useLoad } from '../components/Widgets.jsx'

const LEVELS = ['Beginner', 'Starter', 'Steady', 'Consistent', 'Committed', 'Unstoppable']

function achievementsFor(s) {
  return [
    { id: 'first', title: 'First step', desc: 'Your first check-in', value: s.totalCheckIns, goal: 1 },
    { id: 'builder', title: 'Habit builder', desc: 'Track 3 habits', value: s.activeHabits, goal: 3 },
    { id: 'week', title: 'Week warrior', desc: '7-day streak', value: s.longestStreak, goal: 7 },
    { id: 'fifty', title: 'Fifty', desc: '50 check-ins', value: s.totalCheckIns, goal: 50 },
    { id: 'month', title: 'Month master', desc: '30-day streak', value: s.longestStreak, goal: 30 },
    { id: 'hundred', title: 'Centurion', desc: '100 check-ins', value: s.totalCheckIns, goal: 100 },
  ].map((a) => ({ ...a, unlocked: a.value >= a.goal }))
}

const SHADES = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']

function Heatmap({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  // Start the grid on a Sunday so each column is one week
  const firstDow = parseISODate(days[0].date).getDay()
  const cells = [...Array(firstDow).fill(null), ...days]
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return (
    <div className="heatmap" role="img" aria-label={`Check-ins per day for the last ${Math.ceil(days.length / 7)} weeks`}>
      {weeks.map((week, wi) => (
        <div key={wi} className="heat-col">
          {week.map((d, di) => d ? (
            <i key={di} title={`${parseISODate(d.date).toLocaleDateString()}: ${d.count} check-ins`}
              style={{ background: SHADES[d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4))] }} />
          ) : <i key={di} className="blank" />)}
        </div>
      ))}
    </div>
  )
}

export default function Me() {
  const { user, signOut } = useAuth()
  const { version, theme, setTheme } = useOutletContext()
  const [editing, setEditing] = useState(false)
  const today = toISODate()
  const summary = useLoad(() => api.summary(today), [today, version])
  // Fewer weeks on phones so the newest days fit on screen
  const weeks = window.innerWidth < 768 ? 16 : 26
  const heat = useLoad(() => api.heatmap(today, weeks), [today, version, weeks])

  const s = summary.data
  const level = s ? Math.min(LEVELS.length, 1 + Math.floor(s.totalCheckIns / 25)) : 1
  const achievements = s ? achievementsFor(s) : []

  async function exportData() {
    const from = toISODate(addDays(new Date(), -365))
    const [habits, moods, summaryNow] = await Promise.all([api.habits(today), api.moods(from, today), api.summary(today)])
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user, summary: summaryNow, habits, moods }, null, 2)],
      { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifetrack-export-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Account" title="Profile" />

      <div className="me-grid">
        <div className="col">
          <section className="card profile-card">
            <div className="avatar-wrap">
              {user?.equippedCrown && <Crown id={user.equippedCrown} size={36} className="avatar-crown" />}
              <div className="avatar xl">
                {user?.avatar ? <img src={user.avatar} alt="Your profile picture" /> : initials(user?.name)}
              </div>
            </div>
            <div>
              <h2>{user?.name}</h2>
              <div className="muted small">{user?.email}</div>
              <div className="muted small">Your ID: <strong>#{user?.id}</strong> (friends can find you with it)</div>
              {s && (
                <div className="muted small">
                  Member since {new Date(s.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </div>
              )}
              <span className="level-pill"><Icon name="trophy" size={13} /> Level {level} · {LEVELS[level - 1]}</span>
            </div>
            <button className="icon-btn subtle edit-btn" onClick={() => setEditing(true)} aria-label="Edit profile">
              <Icon name="edit" size={17} />
            </button>
          </section>

          <RewardsCard />

          <div className="stat-trio">
            <div className="card stat"><b style={{ color: 'var(--orange)' }}>{s?.currentStreak ?? 0}</b><span>Day streak</span></div>
            <div className="card stat"><b style={{ color: 'var(--primary)' }}>{s?.activeHabits ?? 0}</b><span>Active habits</span></div>
            <div className="card stat"><b style={{ color: 'var(--green)' }}>{s?.totalCheckIns ?? 0}</b><span>Check-ins</span></div>
          </div>

          <section className="card settings">
            <div className="setting">
              <div className="setting-icon dark"><Icon name="moon" size={17} /></div>
              <span>Dark mode</span>
              <button className={`toggle ${theme === 'dark' ? 'on' : ''}`} role="switch" aria-checked={theme === 'dark'}
                aria-label="Dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><i /></button>
            </div>
            <button className="setting" onClick={exportData}>
              <div className="setting-icon green"><Icon name="download" size={17} /></div>
              <span>Export my data</span>
              <Icon name="chevronRight" size={18} className="muted" />
            </button>
            <button className="setting danger" onClick={signOut}>
              <div className="setting-icon red"><Icon name="logout" size={17} /></div>
              <span>Sign out</span>
            </button>
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2>Achievements</h2>
              <span className="accent small">{achievements.filter((a) => a.unlocked).length} / {achievements.length}</span>
            </div>
            <div className="badges">
              {achievements.map((a) => (
                <div key={a.id} className={`badge ${a.unlocked ? 'unlocked' : ''}`} title={a.desc}>
                  <div className="badge-icon"><Icon name={a.unlocked ? 'trophy' : 'lock'} size={22} /></div>
                  <strong>{a.title}</strong>
                  <span>{a.unlocked ? a.desc : `${Math.min(a.value, a.goal)} / ${a.goal}`}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Check-in activity</h2>
              <span className="legend small muted">Less {SHADES.map((c) => <i key={c} style={{ background: c }} />)} More</span>
            </div>
            {heat.data && <Heatmap days={heat.data} />}
          </section>
        </div>
      </div>
      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
    </div>
  )
}
