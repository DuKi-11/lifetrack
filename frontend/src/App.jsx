import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import Home from './pages/Home.jsx'
import Habits from './pages/Habits.jsx'
import Community from './pages/Community.jsx'
import GroupPage from './pages/GroupPage.jsx'
import Stats from './pages/Stats.jsx'
import Me from './pages/Me.jsx'

function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="splash"><div className="logo-mark big">L</div></div>
  if (status !== 'signedIn') return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return children
}

function GuestOnly({ children }) {
  const { status } = useAuth()
  if (status === 'loading') return <div className="splash"><div className="logo-mark big">L</div></div>
  if (status === 'signedIn') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/:id" element={<GroupPage />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/me" element={<Me />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
