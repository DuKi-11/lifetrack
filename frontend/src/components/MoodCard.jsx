import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { MOODS } from '../habitMeta.js'
import Icon from './Icon.jsx'

/** Log today's mood (1–5) with a short note. */
export default function MoodCard({ date, entry, onSaved }) {
  const [score, setScore] = useState(entry?.score ?? null)
  const [note, setNote] = useState(entry?.note ?? '')
  const [status, setStatus] = useState(entry ? 'saved' : 'idle')
  const [error, setError] = useState('')

  useEffect(() => {
    setScore(entry?.score ?? null)
    setNote(entry?.note ?? '')
    setStatus(entry ? 'saved' : 'idle')
  }, [entry])

  async function save(nextScore = score) {
    if (!nextScore) return
    setStatus('saving'); setError('')
    try {
      const saved = await api.saveMood(date, nextScore, note)
      setStatus('saved')
      onSaved?.(saved)
    } catch (err) {
      setError(err.message); setStatus('dirty')
    }
  }

  return (
    <section className="card mood-card">
      <div className="card-head">
        <h2>How are you feeling today?</h2>
        {status === 'saved' && <span className="saved-tag"><Icon name="check" size={14} stroke={3} /> Saved</span>}
      </div>
      <div className="mood-options" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => (
          <button key={m.score} type="button" role="radio" aria-checked={score === m.score}
            className={`mood-btn ${score === m.score ? 'active' : ''}`}
            onClick={() => { setScore(m.score); save(m.score) }}>
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="mood-note">
        <input value={note} maxLength={280} placeholder={score ? 'Add a short note (optional)' : 'Pick a mood first'}
          disabled={!score} onChange={(e) => { setNote(e.target.value); setStatus('dirty') }}
          onKeyDown={(e) => e.key === 'Enter' && save()} aria-label="Mood note" />
        <button className="btn btn-soft" disabled={!score || status !== 'dirty'} onClick={() => save()}>
          {status === 'saving' ? 'Saving…' : 'Save note'}
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
    </section>
  )
}
