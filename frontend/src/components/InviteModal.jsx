import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from './Icon.jsx'
import UserAvatar from './UserAvatar.jsx'
import { useLoad } from './Widgets.jsx'

/** Search LifeTrack users by name or ID and invite them. With nothing typed, shows your friends. */
export default function InviteModal({ groupId, memberIds, onClose, onInvited }) {
  const friends = useLoad(() => api.friends(), [])
  const [query, setQuery] = useState('')
  const [found, setFound] = useState({ query: '', users: [], error: '' })
  const [sent, setSent] = useState(new Set())
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const q = query.trim()
  const searching = q.length >= 2 || /^#?\d+$/.test(q)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Search as you type (waits a moment after the last key press)
  useEffect(() => {
    if (!searching) return
    let alive = true
    const timer = setTimeout(() => {
      api.searchUsers(q)
        .then((users) => alive && setFound({ query: q, users, error: '' }))
        .catch((err) => alive && setFound({ query: q, users: [], error: err.message }))
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [q, searching])

  const people = searching
    ? found.users
    : (friends.data?.friends || []).map((f) => f.user)
  const list = people.filter((u) => !memberIds.has(u.id))
  const waiting = searching && found.query !== q

  async function invite(user) {
    setBusyId(user.id); setError('')
    try {
      await api.inviteToGroup(groupId, user.id)
      setSent((s) => new Set(s).add(user.id))
      onInvited()
    } catch (err) { setError(err.message) }
    setBusyId(null)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
        <div className="modal-head">
          <h2 id="invite-modal-title">Invite people</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <label className="field">
          <span className="sr-only">Search by name or ID</span>
          <div className="input-wrap">
            <Icon name="search" size={18} className="input-icon" />
            <input type="search" value={query} placeholder="Search by name or ID (like #12)" autoFocus maxLength={80}
              onChange={(e) => setQuery(e.target.value)} />
          </div>
        </label>

        <p className="list-title" style={{ margin: 0 }}>{searching ? 'Results' : 'Your friends'}</p>
        {!searching && friends.loading && <p className="muted">Loading…</p>}
        {friends.error && !searching && <p className="form-error">{friends.error.message}</p>}
        {found.error && searching && <p className="form-error">{found.error}</p>}
        {waiting && <p className="muted small">Searching…</p>}
        {!waiting && !found.error && !(friends.loading && !searching) && list.length === 0 && (
          <p className="muted">
            {searching
              ? 'No one found. Only people who have signed up for LifeTrack can be invited.'
              : q.length === 1 ? 'Keep typing…' : 'No friends to show yet. Search for someone above by their name or ID.'}
          </p>
        )}
        <div className="person-list">
          {!waiting && list.map((user) => (
            <div key={user.id} className="person-row">
              <UserAvatar user={user} />
              <div className="grow">
                <div className="person-name">{user.name}</div>
                <div className="muted small">ID #{user.id}</div>
              </div>
              {sent.has(user.id)
                ? <span className="ok-msg">Invited</span>
                : <button className="btn btn-soft" disabled={busyId === user.id} onClick={() => invite(user)}>Invite</button>}
            </div>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
