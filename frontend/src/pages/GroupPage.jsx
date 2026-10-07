import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDays, api, parseISODate, toISODate } from '../api.js'
import { groupTier } from '../habitMeta.js'
import Icon from '../components/Icon.jsx'
import InviteModal from '../components/InviteModal.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import PostModal from '../components/PostModal.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import { ErrorNote, useLoad } from '../components/Widgets.jsx'
import { useAuth } from '../auth.jsx'

function dayLabel(iso) {
  const today = toISODate()
  if (iso === today) return 'Today'
  if (iso === toISODate(addDays(new Date(), -1))) return 'Yesterday'
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function GroupPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const detail = useLoad(() => api.group(id, toISODate()), [id, reload])
  const [showPost, setShowPost] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [actionError, setActionError] = useState('')
  const [boardKey, setBoardKey] = useState(0)

  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(false), 3200)
    return () => clearTimeout(t)
  }, [celebrate])

  if (detail.error) {
    return (
      <div className="page">
        <Link to="/community" className="back-link"><Icon name="chevronLeft" size={16} /> Community</Link>
        <ErrorNote error={detail.error} />
      </div>
    )
  }
  if (!detail.data) return <div className="page"><p className="muted">Loading…</p></div>

  const { group, members, posts } = detail.data
  const refresh = () => setReload((n) => n + 1)
  const isOwner = group.ownerId === user.id
  const tier = groupTier(group.groupStreak)
  const waiting = members.filter((m) => !m.invited && !m.postedToday)

  async function afterPost() {
    setShowPost(false)
    setBoardKey((k) => k + 1)
    const fresh = await api.group(id, toISODate()).catch(() => null)
    if (fresh) {
      detail.setData(fresh)
      if (fresh.group.allPostedToday && !group.allPostedToday) setCelebrate(true)
    } else refresh()
  }

  async function toggleLike(post) {
    setActionError('')
    try {
      const res = await api.likePost(post.id)
      detail.setData((d) => ({ ...d, posts: d.posts.map((p) => (p.id === post.id ? { ...p, likedByMe: res.liked, likeCount: res.likeCount } : p)) }))
      setBoardKey((k) => k + 1)
    } catch (err) { setActionError(err.message) }
  }

  async function removePost(post) {
    if (!window.confirm('Delete your photo? Your streak for that day will be lost.')) return
    setActionError('')
    try { await api.deletePost(post.id); refresh() } catch (err) { setActionError(err.message) }
  }

  async function leaveOrDelete() {
    const msg = isOwner ? `Delete "${group.name}" for everyone? All photos will be lost.` : `Leave "${group.name}"?`
    if (!window.confirm(msg)) return
    try {
      if (isOwner) await api.deleteGroup(group.id)
      else await api.leaveGroup(group.id)
      navigate('/community')
    } catch (err) { setActionError(err.message) }
  }

  let banner
  if (group.allPostedToday) {
    banner = { tone: 'win', text: `Everyone posted today! The group streak is ${group.groupStreak} ${group.groupStreak === 1 ? 'day' : 'days'} 🔥` }
  } else if (!group.myPostedToday) {
    banner = { tone: 'todo', text: group.groupStreak > 0
      ? `Post your photo to keep the ${group.groupStreak}-day group streak alive!`
      : 'Post your photo to start the group streak!' }
  } else {
    const names = waiting.map((m) => m.user.name.split(' ')[0])
    banner = { tone: 'wait', text: `You're done! Waiting for ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}.` }
  }

  return (
    <div className="page">
      <Link to="/community" className="back-link"><Icon name="chevronLeft" size={16} /> Community</Link>

      <header className="page-header">
        <div>
          <h1>{group.name}</h1>
          {group.goal && <div className="eyebrow" style={{ marginTop: 4 }}>{group.goal}</div>}
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowPost(true)}>
            <Icon name="camera" size={18} /> {group.myPostedToday ? 'Replace photo' : 'Post photo'}
          </button>
        </div>
      </header>

      {actionError && <div className="alert">{actionError}</div>}

      <section className={`group-hero gtier-${tier.level}`} aria-label="Group streak">
        <div>
          <div className="gh-label">Group streak</div>
          <div className="gh-value"><Icon name="flame" size={28} fill="currentColor" /> {group.groupStreak} {group.groupStreak === 1 ? 'day' : 'days'}</div>
          <div className="gh-next">
            {tier.next ? `${tier.daysToNext} more ${tier.daysToNext === 1 ? 'day' : 'days'} to ${tier.next.name}` : 'Top rank reached. You are Champions!'}
          </div>
        </div>
        <div className="gh-medal">
          <div className="medal"><Icon name="trophy" size={28} /></div>
          {tier.name}
        </div>
      </section>

      <div className={`group-banner ${banner.tone}`}>{banner.text}</div>

      <div className="stat-trio" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="card tile"><div className="tile-label muted small">Your streak</div>
          <div className="tile-value"><Icon name="flame" size={18} fill="currentColor" className="flame" /> {group.myStreak}</div></div>
        <div className="card tile"><div className="tile-label muted small">Posted today</div>
          <div className="tile-value">{group.postedToday}/{group.memberCount}</div></div>
      </div>

      <Leaderboard groupId={group.id} meId={user.id} refreshKey={`${reload}-${boardKey}`} />

      <div className="community-grid">
        <div className="stack">
          <h2>Photos</h2>
          {posts.length === 0 && (
            <div className="empty card">
              <div className="empty-icon"><Icon name="camera" size={28} /></div>
              <h3>No photos yet</h3>
              <p className="muted">Be the first to post. Your friends can like it to cheer you on.</p>
            </div>
          )}
          {posts.map((p) => (
            <article key={p.id} className="card post-card">
              <header className="post-head">
                <UserAvatar user={p.user} size={36} />
                <div className="grow">
                  <div className="person-name">{p.user.id === user.id ? 'You' : p.user.name}</div>
                  <div className="muted small">{dayLabel(p.day)}</div>
                </div>
                {p.user.id === user.id && (
                  <button className="icon-btn subtle" aria-label="Delete photo" onClick={() => removePost(p)}><Icon name="trash" size={16} /></button>
                )}
              </header>
              <img className="post-photo" src={p.photo} alt={`${p.user.name}'s photo from ${dayLabel(p.day)}`} loading="lazy" />
              {p.caption && <p className="post-caption">{p.caption}</p>}
              <button className={`like-btn ${p.likedByMe ? 'on' : ''}`} onClick={() => toggleLike(p)} aria-pressed={p.likedByMe}>
                <Icon name="heart" size={20} fill={p.likedByMe ? 'currentColor' : 'none'} />
                <span>{p.likeCount > 0 ? p.likeCount : 'Like'}</span>
              </button>
            </article>
          ))}
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Members</h2>
              <button className="btn btn-soft" onClick={() => setShowInvite(true)}><Icon name="plus" size={16} /> Invite</button>
            </div>
            <div className="person-list">
              {members.map((m) => (
                <div key={m.user.id} className="person-row">
                  <UserAvatar user={m.user} />
                  <div className="grow">
                    <div className="person-name">{m.user.id === user.id ? 'You' : m.user.name}{m.owner && <span className="badge">Owner</span>}</div>
                    <div className="muted small">
                      {m.invited ? 'Invited' : m.postedToday ? 'Posted today ✓' : 'Waiting…'}
                    </div>
                  </div>
                  {!m.invited && (
                    <span className={`streak-pill ${m.streak > 0 ? 'on' : ''}`} title="Personal streak in this group">
                      <Icon name="flame" size={15} fill="currentColor" /> {m.streak}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
          <button className="btn btn-danger-ghost" style={{ alignSelf: 'flex-start' }} onClick={leaveOrDelete}>
            {isOwner ? 'Delete group' : 'Leave group'}
          </button>
        </div>
      </div>

      {showPost && <PostModal group={group} onClose={() => setShowPost(false)} onPosted={afterPost} />}
      {showInvite && (
        <InviteModal groupId={group.id} memberIds={new Set(members.map((m) => m.user.id))}
          onClose={() => setShowInvite(false)} onInvited={refresh} />
      )}
      {celebrate && (
        <div className="celebrate" aria-hidden="true">
          {['🔥', '🎉', '✨', '🔥', '🎉', '💪', '✨', '🔥'].map((e, i) => <span key={i} style={{ '--i': i }}>{e}</span>)}
        </div>
      )}
    </div>
  )
}
