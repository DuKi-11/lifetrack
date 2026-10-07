import { CROWN_STYLES } from '../rewardMeta.js'

/** A little crown. On its own it's an icon; inside UserAvatar it sits on top of the picture. */
export default function Crown({ id, size = 22, className }) {
  const style = CROWN_STYLES[id]
  if (!style) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {id === 'ROYAL' && (
        <defs>
          <linearGradient id="crown-royal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F43F5E" /><stop offset=".35" stopColor="#F59E0B" />
            <stop offset=".65" stopColor="#10B981" /><stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      )}
      <path d="M3 8.5l4.6 4L12 4.5l4.4 8 4.6-4-1.8 10.5H4.8z" fill={style.fill} stroke={style.edge} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
