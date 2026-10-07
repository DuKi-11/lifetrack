import { useEffect, useState } from 'react'
import { api, toISODate } from '../api.js'
import { CATEGORIES, COLORS, tint } from '../habitMeta.js'
import Icon from './Icon.jsx'

export default function HabitModal({ habit, onClose, onSaved }) {
  const editing = Boolean(habit)
  const [name, setName] = useState(habit?.name || '')
  const [goal, setGoal] = useState(habit?.goal || '')
  const [category, setCategory] = useState(habit?.category || 'HEALTH')
  const [color, setColor] = useState(habit?.color || COLORS[0])
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
    if (!name.trim()) { setFieldErrors({ name: 'Please give the habit a name' }); return }
    setSaving(true); setError(''); setFieldErrors({})
    const body = { name, goal, category, color }
    try {
      if (editing) await api.updateHabit(toISODate(), habit.id, body)
      else await api.createHabit(toISODate(), body)
      onSaved()
    } catch (err) {
      setError(err.message); setFieldErrors(err.fields)
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${habit.name}" and all its check-ins?`)) return
    setSaving(true)
    try { await api.deleteHabit(habit.id); onSaved() } catch (err) { setError(err.message); setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="habit-modal-title">
        <div className="modal-head">
          <h2 id="habit-modal-title">{editing ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="habit-preview">
          <div className="habit-icon" style={{ background: tint(color), color }}>
            {(name.trim()[0] || '?').toUpperCase()}
          </div>
          <div>
            <div className="habit-name">{name.trim() || 'Your new habit'}</div>
            <div className="muted small">{goal.trim() || 'Add a goal, like "10 min"'}</div>
          </div>
        </div>

        <label className="field">
          <span>Name</span>
          <input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Study Java" />
          {fieldErrors.name && <em className="field-error">{fieldErrors.name}</em>}
        </label>

        <label className="field">
          <span>Goal <small className="muted">(optional)</small></span>
          <input value={goal} maxLength={60} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 45 min, 8 cups, 20 pages" />
        </label>

        <div className="field">
          <span>Category</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.value} className={`chip ${category === c.value ? 'active' : ''}`}
                onClick={() => setCategory(c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Color</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} className={`swatch ${color === c ? 'active' : ''}`}
                style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
            ))}
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-actions">
          {editing && (
            <button type="button" className="btn btn-danger-ghost" onClick={remove} disabled={saving}>
              <Icon name="trash" size={18} /> Delete
            </button>
          )}
          <div className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create habit'}</button>
        </div>
      </form>
    </div>
  )
}
