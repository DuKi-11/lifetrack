import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Please enter a valid email'
    if (!password) next.password = 'Please enter your password'
    setErrors(next); setMessage('')
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setMessage(err.message); setErrors(err.fields)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your streak."
      footer={<>New to LifeTrack? <Link to="/signup">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" icon="mail" type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })) }}
          error={errors.email} />
        <Field label="Password" icon="lock" type="password" autoComplete="current-password" placeholder="Your password"
          value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })) }}
          error={errors.password} />
        {message && <div className="alert" role="alert">{message}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  )
}
