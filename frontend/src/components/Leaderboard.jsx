import { useState } from 'react'
import { api, toISODate } from '../api.js'
import Icon from './Icon.jsx'
import UserAvatar from './UserAvatar.jsx'
import { useLoad } from './Widgets.jsx'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/** Group members ranked by points: 10 per photo, 2 per like received. `refreshKey` reloads it after posts and likes. */
export default function Leaderboard({ groupId, meId, refreshKey }) {
  const [period, setPeriod] = useState('week')
  const board = useLoad(() => api.leaderboard(groupId, toISODate(), period), [groupId, period, refreshKey])
  const rows = board.data || []

  return (
    <section className="card leaderboard">
      <div className="card-head">
        <h2><Icon name="trophy" size={18} className="lb-trophy" /> Leaderboard</h2>
        <div className="chips" role="group" aria-label="Time period">
          <button className={`chip ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')} aria-pressed={period === 'week'}>This week</button>
          <button className={`chip ${period === 'all' ? 'active' : ''}`} onClick={() => setPeriod('all')} aria-pressed={period === 'all'}>All time</button>
        </div>
      </div>
      {board.error && <p className="form-error">{board.error.message}</p>}
      <ol className="lb-list">
        {rows.map((r) => (
          <li key={r.user.id} className={`lb-row ${r.user.id === meId ? 'me' : ''} ${r.points > 0 && r.rank <= 3 ? `top-${r.rank}` : ''}`}>
            <span className="lb-rank" aria-label={`Rank ${r.rank}`}>{r.points > 0 && MEDALS[r.rank] ? MEDALS[r.rank] : r.rank}</span>
            <UserAvatar user={r.user} size={36} />
            <div className="grow">
              <div className="person-name">{r.user.id === meId ? 'You' : r.user.name}</div>
              <div className="muted small">
                {r.photos} {r.photos === 1 ? 'photo' : 'photos'} · {r.likes} {r.likes === 1 ? 'like' : 'likes'}
                {r.streak > 0 && <> · <span className="lb-streak">{r.streak}-day streak</span></>}
              </div>
            </div>
            <div className="lb-points"><b>{r.points}</b><span>pts</span></div>
          </li>
        ))}
      </ol>
      <p className="muted small lb-note">10 points for each photo, 2 for each like you get.</p>
    </section>
  )
}
