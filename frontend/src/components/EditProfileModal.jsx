import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { initials } from '../habitMeta.js'
import Field from './Field.jsx'
import Icon from './Icon.jsx'

const SIZE = 256

// Crops the picture to a centered square and shrinks it, so what we upload stays small
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')) }
    img.src = url
  })
}

export default function EditProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth()
  const fileInput = useRef(null)

  // Photo: pick one to preview it, then press "Save photo". undefined = nothing picked, '' = remove
  const [pendingPhoto, setPendingPhoto] = useState(undefined)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // Name + email
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [emailPassword, setEmailPassword] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [detailsFields, setDetailsFields] = useState({})
  const [detailsMsg, setDetailsMsg] = useState('')
  const [detailsBusy, setDetailsBusy] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwFields, setPwFields] = useState({})
  const [pwMsg, setPwMsg] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const shownPhoto = pendingPhoto === undefined ? user.avatar : pendingPhoto
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase()
  const detailsChanged = emailChanged || name.trim() !== user.name

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function savePhoto() {
    setPhotoBusy(true); setPhotoError('')
    try {
      await updateProfile({ avatar: pendingPhoto })
      setPendingPhoto(undefined)
    } catch (err) { setPhotoError(err.message) }
    setPhotoBusy(false)
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Please choose an image file'); return }
    try { setPendingPhoto(await resizeImage(file)); setPhotoError('') } catch (err) { setPhotoError(err.message) }
  }

  async function saveDetails(e) {
    e.preventDefault()
    const errs = {}
    if (!name.trim()) errs.name = 'Please enter your name'
    if (!email.trim()) errs.email = 'Please enter your email'
    if (emailChanged && !emailPassword) errs.currentPassword = 'Enter your current password to change your email'
    setDetailsFields(errs); setDetailsMsg('')
    if (Object.keys(errs).length) return

    setDetailsBusy(true); setDetailsError('')
    try {
      await updateProfile({ name, email, currentPassword: emailChanged ? emailPassword : undefined })
      setEmailPassword(''); setDetailsMsg('Saved')
    } catch (err) {
      setDetailsError(err.message); setDetailsFields(err.fields)
    }
    setDetailsBusy(false)
  }

  async function savePassword(e) {
    e.preventDefault()
    const errs = {}
    if (!currentPassword) errs.currentPassword = 'Please enter your current password'
    if (newPassword.length < 8) errs.newPassword = 'Password must be 8 to 72 characters'
    setPwFields(errs); setPwMsg('')
    if (Object.keys(errs).length) return

    setPwBusy(true); setPwError('')
    try {
      await api.changePassword(currentPassword, newPassword)
      setCurrentPassword(''); setNewPassword(''); setPwMsg('Password changed')
    } catch (err) {
      setPwError(err.message); setPwFields(err.fields)
    }
    setPwBusy(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div className="modal-head">
          <h2 id="profile-modal-title">Edit profile</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        <section className="edit-section">
          <h3>Photo</h3>
          <div className="avatar-edit">
            <div className="avatar">
              {shownPhoto ? <img src={shownPhoto} alt="Profile picture" /> : initials(user.name)}
            </div>
            <div className="avatar-edit-actions">
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickFile} />
              {pendingPhoto === undefined ? (
                <>
                  <button type="button" className="btn btn-soft" onClick={() => fileInput.current.click()}>
                    <Icon name="edit" size={16} /> {user.avatar ? 'Change photo' : 'Upload photo'}
                  </button>
                  {user.avatar && (
                    <button type="button" className="btn btn-danger-ghost" onClick={() => setPendingPhoto('')}>Remove</button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" disabled={photoBusy} onClick={savePhoto}>
                    {photoBusy ? 'Saving…' : pendingPhoto === '' ? 'Remove photo' : 'Save photo'}
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={photoBusy} onClick={() => { setPendingPhoto(undefined); setPhotoError('') }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          {photoError && <p className="form-error" role="alert">{photoError}</p>}
        </section>

        <form className="edit-section" onSubmit={saveDetails}>
          <h3>Name and email</h3>
          <Field label="Name" icon="user" value={name} maxLength={80} autoComplete="name"
            onChange={(e) => { setName(e.target.value); setDetailsMsg('') }} error={detailsFields.name} />
          <Field label="Email" icon="mail" type="email" value={email} maxLength={160} autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setDetailsMsg('') }} error={detailsFields.email} />
          {emailChanged && (
            <Field label="Current password" icon="lock" type="password" value={emailPassword} autoComplete="current-password"
              onChange={(e) => setEmailPassword(e.target.value)} error={detailsFields.currentPassword}
              hint={<em className="muted small" style={{ fontStyle: 'normal', fontWeight: 400 }}>Needed because your email is how you sign in.</em>} />
          )}
          {detailsError && <p className="form-error" role="alert">{detailsError}</p>}
          <div className="modal-actions">
            {detailsMsg && <span className="ok-msg" role="status">{detailsMsg}</span>}
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={detailsBusy || !detailsChanged}>
              {detailsBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        <form className="edit-section" onSubmit={savePassword}>
          <h3>Password</h3>
          <Field label="Current password" icon="lock" type="password" value={currentPassword} autoComplete="current-password"
            onChange={(e) => { setCurrentPassword(e.target.value); setPwMsg('') }} error={pwFields.currentPassword} />
          <Field label="New password" icon="lock" type="password" value={newPassword} autoComplete="new-password"
            onChange={(e) => { setNewPassword(e.target.value); setPwMsg('') }} error={pwFields.newPassword}
            hint={<em className="muted small" style={{ fontStyle: 'normal', fontWeight: 400 }}>At least 8 characters.</em>} />
          {pwError && <p className="form-error" role="alert">{pwError}</p>}
          <div className="modal-actions">
            {pwMsg && <span className="ok-msg" role="status">{pwMsg}</span>}
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={pwBusy || !currentPassword || !newPassword}>
              {pwBusy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
