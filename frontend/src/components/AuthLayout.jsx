import Icon from './Icon.jsx'

// Two-column layout for sign in / sign up: brand panel on wide screens, form on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-brand" aria-hidden="true">
        <div className="auth-brand-logo">
          <div className="logo-mark light">L</div>
          <span>LifeTrack</span>
        </div>

        <div className="auth-brand-copy">
          <h2>Build better habits,<br />one day at a time.</h2>
          <p>Track habits and mood in one simple place, and see your progress every week.</p>
        </div>

        <div className="auth-preview">
          <div className="auth-preview-card">
            <div>
              <div className="ap-label">Today's progress</div>
              <div className="ap-value">5 of 8 goals done</div>
              <div className="ap-pill"><Icon name="flame" size={14} /> 12-day streak</div>
            </div>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="31" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="9" />
              <circle cx="38" cy="38" r="31" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 31 * 0.62} ${2 * Math.PI * 31}`} transform="rotate(-90 38 38)" />
              <text x="38" y="43" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">62%</text>
            </svg>
          </div>
          <div className="auth-preview-row">
            {[['Habits', 'Check off daily'], ['Mood', 'Log 1–5 + note'], ['Stats', 'Weekly chart']].map(([a, b]) => (
              <div key={a} className="auth-mini"><strong>{a}</strong><span>{b}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo">
            <div className="logo-mark">L</div>
            <span>LifeTrack</span>
          </div>
          <h1>{title}</h1>
          <p className="muted auth-subtitle">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </section>
    </div>
  )
}
