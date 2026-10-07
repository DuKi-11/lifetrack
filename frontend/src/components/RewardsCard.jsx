import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { THEME_STYLES } from '../rewardMeta.js'
import Crown from './Crown.jsx'
import Icon from './Icon.jsx'
import { useLoad } from './Widgets.jsx'

/** Points, and the color themes and crowns they unlock. Tap an unlocked one to wear it. */
export default function RewardsCard() {
  const { refreshUser } = useAuth()
  const rewards = useLoad(() => api.rewards(), [])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const r = rewards.data

  async function equip(kind, id) {
    setBusy(`${kind}-${id}`); setError('')
    try {
      rewards.setData(await api.equipReward(kind, id))
      await refreshUser()
    } catch (err) { setError(err.message) }
    setBusy('')
  }

  if (rewards.error) return <section className="card"><p className="form-error">{rewards.error.message}</p></section>
  if (!r) return <section className="card"><p className="muted">Loading rewards…</p></section>

  const pct = r.next ? Math.min(100, Math.round((100 * r.points) / r.next.points)) : 100

  return (
    <section className="card rewards">
      <div className="card-head">
        <h2><Icon name="sparkle" size={18} className="lb-trophy" /> Rewards</h2>
        <div className="lb-points"><b>{r.points}</b><span>pts</span></div>
      </div>
      <div className="progress-line"><div style={{ width: `${pct}%` }} /></div>
      <p className="muted small reward-next">
        {r.next ? `${r.next.points - r.points} more points to unlock ${r.next.name}.` : 'You unlocked everything!'}
      </p>

      <h3 className="list-title">Color themes</h3>
      <div className="reward-grid">
        {r.themes.map((t) => {
          const st = THEME_STYLES[t.id] || THEME_STYLES.VIOLET
          const active = r.equippedTheme === t.id
          return (
            <button key={t.id} className={`reward ${active ? 'active' : ''} ${t.unlocked ? '' : 'locked'}`} disabled={!t.unlocked || busy === `THEME-${t.id}`}
              onClick={() => !active && equip('THEME', t.id)} aria-pressed={active}>
              <span className="swatch-dot" style={{ background: `linear-gradient(135deg, ${st.from}, ${st.to})` }}>
                {!t.unlocked && <Icon name="lock" size={16} />}
                {active && <Icon name="check" size={16} stroke={3} />}
              </span>
              <b>{t.name}</b>
              <span className="muted small">{active ? 'In use' : t.unlocked ? 'Tap to use' : `${t.points} pts`}</span>
            </button>
          )
        })}
      </div>

      <h3 className="list-title">Crowns</h3>
      <div className="reward-grid">
        <button className={`reward ${!r.equippedCrown ? 'active' : ''}`} disabled={!r.equippedCrown || busy === 'CROWN-NONE'}
          onClick={() => equip('CROWN', 'NONE')} aria-pressed={!r.equippedCrown}>
          <span className="swatch-dot plain"><Icon name="close" size={16} /></span>
          <b>No crown</b>
          <span className="muted small">{r.equippedCrown ? 'Tap to remove' : 'In use'}</span>
        </button>
        {r.crowns.map((c) => {
          const active = r.equippedCrown === c.id
          return (
            <button key={c.id} className={`reward ${active ? 'active' : ''} ${c.unlocked ? '' : 'locked'}`} disabled={!c.unlocked || busy === `CROWN-${c.id}`}
              onClick={() => !active && equip('CROWN', c.id)} aria-pressed={active}>
              <span className="swatch-dot plain"><Crown id={c.id} size={30} />{!c.unlocked && <Icon name="lock" size={14} className="lock-badge" />}</span>
              <b>{c.name.replace(' crown', '')}</b>
              <span className="muted small">{active ? 'In use' : c.unlocked ? 'Tap to wear' : `${c.points} pts`}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="muted small lb-note">Earn points in groups: 10 for each photo you post, 2 for each like from a friend. Crowns show next to your picture for everyone.</p>
    </section>
  )
}
