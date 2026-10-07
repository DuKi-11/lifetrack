import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'

function strength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < 8) return { level: pw ? 1 : 0, label: pw ? 'Too short' : '' }
  if (score <= 2) return { level: 2, label: 'Okay' }
  if (score <= 3) return { level: 3, label: 'Good' }
  return { level: 4, label: 'Strong' }
}

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const pw = strength(form.password)

  // Typing in a field clears its error message
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((errs) => ({ ...errs, [key]: undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Please enter a valid email'
    if (form.password.length < 8) next.password = 'Use at least 8 characters'
    if (form.confirm !== form.password) next.confirm = "Passwords don't match"
    setErrors(next); setMessage('')
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await signUp(form.name.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setMessage(err.message); setErrors(err.fields)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your habits and mood in under a minute."
      footer={<>Already have an account? <Link to="/signin">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Name" icon="person" autoComplete="name" placeholder="Your name"
          value={form.name} onChange={set('name')} error={errors.name} />
        <Field label="Email" icon="mail" type="email" autoComplete="email" placeholder="you@example.com"
          value={form.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" icon="lock" type="password" autoComplete="new-password" placeholder="At least 8 characters"
          value={form.password} onChange={set('password')} error={errors.password}
          hint={form.password && (
            <div className="strength" data-level={pw.level}>
              <div className="strength-bars">{[1, 2, 3, 4].map((i) => <i key={i} />)}</div>
              <small>{pw.label}</small>
            </div>
          )} />
        <Field label="Confirm password" icon="lock" type="password" autoComplete="new-password" placeholder="Type it again"
          value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        {message && <div className="alert" role="alert">{message}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  )
}
