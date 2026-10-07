import { initials } from '../habitMeta.js'
import Crown from './Crown.jsx'

/** A person's picture (or their initials), with their crown on top if they've equipped one. */
export default function UserAvatar({ user, size = 40 }) {
  return (
    <div className="avatar-wrap">
      {user.crown && <Crown id={user.crown} size={Math.round(size * 0.5)} className="avatar-crown" />}
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {user.avatar ? <img src={user.avatar} alt="" /> : initials(user.name)}
      </div>
    </div>
  )
}
