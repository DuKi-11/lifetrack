import { useEffect, useRef, useState } from 'react'
import { api, toISODate } from '../api.js'
import { resizePhoto } from '../image.js'
import Icon from './Icon.jsx'

/** Pick (or take) today's photo, add a caption and post it to the group. */
export default function PostModal({ group, onClose, onPosted }) {
  const fileInput = useRef(null)
  const [photo, setPhoto] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return }
    try { setPhoto(await resizePhoto(file)); setError('') } catch (err) { setError(err.message) }
  }

  async function submit(e) {
    e.preventDefault()
    if (!photo) { setError('Please choose a photo first'); return }
    setBusy(true); setError('')
    try {
      onPosted(await api.postPhoto(group.id, toISODate(), photo, caption))
    } catch (err) {
      setError(err.message); setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="post-modal-title" onSubmit={submit}>
        <div className="modal-head">
          <h2 id="post-modal-title">{group.myPostedToday ? "Replace today's photo" : "Post today's photo"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {group.goal && <p className="muted small" style={{ margin: 0 }}>Goal: {group.goal}</p>}

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickFile} />
        <button type="button" className={`photo-drop ${photo ? 'has-photo' : ''}`} onClick={() => fileInput.current.click()}>
          {photo ? <img src={photo} alt="Your photo" /> : (
            <><Icon name="camera" size={30} /><span>Tap to take or choose a photo</span></>
          )}
        </button>
        {photo && <button type="button" className="link-btn" onClick={() => fileInput.current.click()}>Choose a different photo</button>}

        <label className="field">
          <span>Caption (optional)</span>
          <div className="input-wrap">
            <input value={caption} maxLength={200} placeholder="5 km done!" style={{ paddingLeft: 14 }}
              onChange={(e) => setCaption(e.target.value)} />
          </div>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !photo}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </form>
    </div>
  )
}
