import { useEffect, useState } from 'react'
import { api, toISODate } from '../api.js'
import Field from './Field.jsx'
import Icon from './Icon.jsx'

export default function GroupModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setFieldErrors({ name: 'Please give the group a name' }); return }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      const group = await api.createGroup(toISODate(), { name, goal })
      onSaved(group)
    } catch (err) {
      setError(err.message); setFieldErrors(err.fields); setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title" onSubmit={submit}>
        <div className="modal-head">
          <h2 id="group-modal-title">New group goal</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <Field label="Group name" icon="users" value={name} maxLength={60} placeholder="Morning runners"
          onChange={(e) => setName(e.target.value)} error={fieldErrors.name} autoFocus />
        <Field label="Daily goal" icon="target" value={goal} maxLength={200} placeholder="Post a photo of your run"
          onChange={(e) => setGoal(e.target.value)} error={fieldErrors.goal}
          hint={<em className="muted small" style={{ fontStyle: 'normal', fontWeight: 400 }}>What everyone posts a photo of each day.</em>} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create group'}</button>
        </div>
      </form>
    </div>
  )
}
