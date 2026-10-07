import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, toISODate } from '../api.js'
import { groupTier } from '../habitMeta.js'
import GroupModal from '../components/GroupModal.jsx'
import Icon from '../components/Icon.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import { ErrorNote, PageHeader, useLoad } from '../components/Widgets.jsx'

export default function Community() {
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const groups = useLoad(() => api.groups(toISODate()), [reload])
  const friends = useLoad(() => api.friends(), [reload])
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState({ query: '', users: [], error: '' })
  const [friendMsg, setFriendMsg] = useState({ ok: false, text: '' })
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const q = query.trim()
  const searching = q.length >= 2 || /^#?\d+$/.test(q)

  // Search people as you type (waits a moment after the last key press)
  useEffect(() => {
    if (!searching) return
    let alive = true
    const timer = setTimeout(() => {
      api.searchUsers(q)
        .then((users) => alive && setFound({ query: q, users, error: '' }))
        .catch((err) => alive && setFound({ query: q, users: [], error: err.message }))
    }, 250)
    return () => { alive = false; clearTimeout(timer) }
  }, [q, searching, reload])

  const refresh = () => setReload((n) => n + 1)
  const invites = (groups.data || []).filter((g) => g.myStatus === 'INVITED')
  const mine = (groups.data || []).filter((g) => g.myStatus === 'ACTIVE')

  // Runs an action, then reloads the lists. Errors show under the page header.
  async function run(fn) {
    setActionError('')
    try { await fn(); refresh() } catch (err) { setActionError(err.message) }
  }

  async function addFriend(user) {
    setBusyId(user.id); setFriendMsg({ ok: false, text: '' })
    try {
      await api.addFriend({ userId: user.id })
      setFriendMsg({ ok: true, text: `Friend request sent to ${user.name}` }); refresh()
    } catch (err) { setFriendMsg({ ok: false, text: err.message }) }
    setBusyId(null)
  }

  // Search results, minus people I'm already friends with or have a request with
  const known = new Set(['friends', 'incoming', 'outgoing'].flatMap((k) => (friends.data?.[k] || []).map((f) => f.user.id)))
  const results = found.users.filter((u) => !known.has(u.id))
  const waiting = searching && found.query !== q

  return (
    <div className="page">
      <PageHeader eyebrow="Stay motivated together" title="Community">
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={18} /> New group</button>
      </PageHeader>
      <ErrorNote error={groups.error || friends.error} />
      {actionError && <div className="alert">{actionError}</div>}

      <div className="community-grid">
        <div className="stack">
          {invites.map((g) => (
            <div key={g.id} className="card invite-card">
              <div className="grow">
                <div className="habit-name">{g.name}</div>
                <div className="muted small">{g.invitedBy ? `${g.invitedBy.name} invited you` : 'You were invited'}{g.goal ? ` · ${g.goal}` : ''}</div>
              </div>
              <button className="btn btn-primary" onClick={() => run(() => api.acceptGroup(g.id, toISODate()))}>Join</button>
              <button className="btn btn-ghost" onClick={() => run(() => api.leaveGroup(g.id))}>Decline</button>
            </div>
          ))}

          {!groups.loading && mine.length === 0 && invites.length === 0 && (
            <div className="empty card">
              <div className="empty-icon"><Icon name="users" size={28} /></div>
              <h3>No groups yet</h3>
              <p className="muted">Make a goal with your friends. Everyone posts a photo each day to grow the group streak together.</p>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={18} /> Create your first group</button>
            </div>
          )}

          {mine.map((g) => {
            const tier = groupTier(g.groupStreak)
            return (
            <Link key={g.id} to={`/community/${g.id}`} className={`card group-card ${g.groupStreak >= 2 ? `tiered gtier-${tier.level}` : ''}`}>
              <div className="group-card-top">
                <div className="grow">
                  <div className="habit-name">{g.name}</div>
                  {g.goal && <div className="muted small">{g.goal}</div>}
                </div>
                <span className={`streak-pill ${g.groupStreak >= 2 ? `tiered gtier-${tier.level}` : g.groupStreak > 0 ? 'on' : ''}`}
                  title={`Group streak${g.groupStreak >= 2 ? ` · ${tier.name}` : ''}`}>
                  <Icon name="flame" size={15} fill="currentColor" /> {g.groupStreak}{g.groupStreak >= 2 && ` · ${tier.name}`}
                </span>
              </div>
              <div className="progress-line"><div style={{ width: `${(100 * g.postedToday) / Math.max(g.memberCount, 1)}%` }} /></div>
              <div className="group-card-foot small">
                <span className="muted">{g.postedToday} of {g.memberCount} posted today</span>
                {g.myPostedToday
                  ? <span className="ok-msg">You posted ✓</span>
                  : <span className="accent">Post your photo →</span>}
              </div>
            </Link>
            )
          })}
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Friends</h2></div>
            <div className="add-friend">
              <div className="input-wrap grow">
                <Icon name="search" size={18} className="input-icon" />
                <input type="search" value={query} placeholder="Search by name or ID (like #12)" aria-label="Search people" maxLength={80}
                  onChange={(e) => { setQuery(e.target.value); setFriendMsg({ ok: false, text: '' }) }} />
              </div>
            </div>
            {friendMsg.text && <p className={friendMsg.ok ? 'ok-msg' : 'form-error'} role="status">{friendMsg.text}</p>}

            {searching && (
              <>
                <h3 className="list-title">Results</h3>
                {found.error && <p className="form-error">{found.error}</p>}
                {waiting && <p className="muted small">Searching…</p>}
                {!waiting && !found.error && results.length === 0 && (
                  <p className="muted small">No new people found. Only people who signed up for LifeTrack can be added.</p>
                )}
                <div className="person-list">
                  {!waiting && results.map((u) => (
                    <div key={u.id} className="person-row">
                      <UserAvatar user={u} />
                      <div className="grow">
                        <div className="person-name">{u.name}</div>
                        <div className="muted small">ID #{u.id}</div>
                      </div>
                      <button className="btn btn-primary" disabled={busyId === u.id} onClick={() => addFriend(u)}>Add</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(friends.data?.incoming || []).length > 0 && <h3 className="list-title">Requests</h3>}
            <div className="person-list">
              {(friends.data?.incoming || []).map((f) => (
                <div key={f.friendshipId} className="person-row">
                  <UserAvatar user={f.user} />
                  <div className="grow person-name">{f.user.name}</div>
                  <button className="btn btn-primary" onClick={() => run(() => api.acceptFriend(f.friendshipId))}>Accept</button>
                  <button className="icon-btn subtle" aria-label={`Decline ${f.user.name}`} onClick={() => run(() => api.removeFriend(f.friendshipId))}><Icon name="close" size={16} /></button>
                </div>
              ))}
            </div>

            {(friends.data?.friends || []).length > 0 && <h3 className="list-title">Your friends</h3>}
            <div className="person-list">
              {(friends.data?.friends || []).map((f) => (
                <div key={f.friendshipId} className="person-row">
                  <UserAvatar user={f.user} />
                  <div className="grow person-name">{f.user.name}</div>
                  <button className="icon-btn subtle" aria-label={`Remove ${f.user.name}`}
                    onClick={() => window.confirm(`Remove ${f.user.name} from your friends?`) && run(() => api.removeFriend(f.friendshipId))}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>

            {(friends.data?.outgoing || []).length > 0 && <h3 className="list-title">Waiting for a reply</h3>}
            <div className="person-list">
              {(friends.data?.outgoing || []).map((f) => (
                <div key={f.friendshipId} className="person-row">
                  <UserAvatar user={f.user} />
                  <div className="grow person-name">{f.user.name}</div>
                  <button className="btn btn-ghost" onClick={() => run(() => api.removeFriend(f.friendshipId))}>Cancel</button>
                </div>
              ))}
            </div>

            {friends.data && ['friends', 'incoming', 'outgoing'].every((k) => friends.data[k].length === 0) && (
              <p className="muted small" style={{ margin: '12px 0 0' }}>Search above to find people by name or ID. Your own ID is on your profile.</p>
            )}
          </section>
        </div>
      </div>

      {showNew && (
        <GroupModal onClose={() => setShowNew(false)} onSaved={(g) => { setShowNew(false); navigate(`/community/${g.id}`) }} />
      )}
    </div>
  )
}
