import Icon from './Icon.jsx'

const FLAME = 'M12 22c4 0 7-2.7 7-7 0-3.5-2.5-6-4-8-.5 2-1.5 3-3 3 .5-3-1-6-4-8 0 4-5 6-5 13 0 4.3 3 7 9 7z'

/** The streak flame: grey and quiet at 0 days, then a flickering fire that burns bigger as the streak grows. */
export default function FireIcon({ streak, size = 22 }) {
  if (streak <= 0) return <Icon name="flame" size={size - 4} />
  const heat = streak >= 30 ? 3 : streak >= 7 ? 2 : 1
  return (
    <span className={`fire heat-${heat}`} style={{ width: size, height: size }} aria-hidden="true">
      {heat >= 2 && <i className="spark s1" />}
      {heat >= 3 && <i className="spark s2" />}
      <svg viewBox="0 0 24 24" width={size} height={size} className="fire-svg">
        <path d={FLAME} fill="#F2511B" stroke="#C7340E" strokeWidth="1" strokeLinejoin="round" />
        <path d={FLAME} fill="#FFB020" transform="translate(12 22) scale(.62) translate(-12 -22)" />
        <path d={FLAME} fill="#FFE36B" transform="translate(12 22) scale(.32) translate(-12 -22)" />
      </svg>
    </span>
  )
}
