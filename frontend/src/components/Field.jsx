import { useState } from 'react'
import Icon from './Icon.jsx'

// Labeled text input with an icon, an error message and (for passwords) a show/hide button.
export default function Field({ label, icon, type = 'text', error, hint, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <div className="input-wrap">
        {icon && <Icon name={icon} size={18} className="input-icon" />}
        <input type={isPassword && show ? 'text' : type} aria-invalid={Boolean(error)} {...props} />
        {isPassword && (
          <button type="button" className="input-toggle" onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}>
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {error ? <em className="field-error">{error}</em> : hint}
    </label>
  )
}
