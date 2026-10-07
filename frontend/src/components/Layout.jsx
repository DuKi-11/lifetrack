import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon from './Icon.jsx'
import HabitModal from './HabitModal.jsx'

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/habits', label: 'Habits', icon: 'habits' },
  { to: '/community', label: 'Community', short: 'Groups', icon: 'users' },
  { to: '/stats', label: 'Statistics', short: 'Stats', icon: 'stats' },
  { to: '/me', label: 'Profile', short: 'Me', icon: 'user' },
]

// On phones the + button sits in the middle, so there are two tabs on each side. Profile is the avatar in the page header.
const BOTTOM_NAV = NAV.filter((n) => n.to !== '/me')

function readTheme() {
  try { return localStorage.getItem('lifetrack.theme') || 'light' } catch { return 'light' }
}

export default function Layout() {
  // modal: null (closed), {} (new habit) or a habit object (edit)
  const [modal, setModal] = useState(null)
  // Pages reload their data when this number changes
  const [version, setVersion] = useState(0)
  const [theme, setTheme] = useState(readTheme)
  const { user } = useAuth()

  // The color theme the user unlocked and picked as a reward (VIOLET is the default look)
  const accent = user?.equippedTheme
  useEffect(() => {
    if (accent) document.documentElement.dataset.accent = accent
    else delete document.documentElement.dataset.accent
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('lifetrack.theme', theme) } catch { /* ignore */ }
  }, [theme])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const openNewHabit = useCallback(() => setModal({}), [])
  const editHabit = useCallback((habit) => setModal(habit), [])

  const context = { version, refresh, openNewHabit, editHabit, theme, setTheme }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">L</div>
          <span className="label">LifeTrack</span>
        </div>
        <button className="btn btn-primary sidebar-new" onClick={openNewHabit}>
          <Icon name="plus" size={18} /> <span className="label">New habit</span>
        </button>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="sidebar-link" title={n.label}>
              <Icon name={n.icon} size={20} />
              <span className="label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip label">
          <Icon name="sparkle" size={18} />
          <p><strong>Tip</strong><br />Small daily habits beat big plans. Check in every day to grow your streak.</p>
        </div>
      </aside>

      <main className="main">
        <Outlet context={context} />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {BOTTOM_NAV.slice(0, 2).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="bottom-link">
            <Icon name={n.icon} size={20} />
            <span>{n.short || n.label}</span>
          </NavLink>
        ))}
        <button className="fab" onClick={openNewHabit} aria-label="New habit">
          <Icon name="plus" size={26} />
        </button>
        {BOTTOM_NAV.slice(2).map((n) => (
          <NavLink key={n.to} to={n.to} className="bottom-link">
            <Icon name={n.icon} size={20} />
            <span>{n.short || n.label}</span>
          </NavLink>
        ))}
      </nav>

      {modal && (
        <HabitModal
          habit={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh() }}
        />
      )}
    </div>
  )
}
