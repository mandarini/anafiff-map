import { useEffect, useState } from 'react'

const STORAGE_KEY = 'anafiff:welcome-dismissed'

export function WelcomeOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === '1'
    if (!dismissed) setOpen(true)
  }, [])

  if (!open) {
    return (
      <button
        type="button"
        className="welcome-reopen"
        aria-label="Open introduction"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
    )
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  return (
    <div className="welcome-backdrop" role="dialog" aria-modal="true">
      <div className="welcome-card">
        <h1>Mapping the Present</h1>
        <p className="welcome-subtitle">ANAFIFF psychogeographical collective journal</p>
        <p>
          Walk Anafi. Drop a pin where you feel something. Leave a note, a photo,
          or a voice — anonymously — for the rest of the festival to find.
        </p>
        <h2>Three prompts to carry with you</h2>
        <ul>
          <li>Note where time feels slower.</li>
          <li>Find a spot that repels you, and another that attracts you.</li>
          <li>Track a single recurring colour along your route.</li>
        </ul>
        <p className="welcome-hint">Tap anywhere on the map to drop a pin.</p>
        <small className="welcome-disclaimer">
          <strong>Ongoing project by Evangelos Pournaras &amp; Katerina Skroumpelou.</strong>
          {' '}By participating, anything you submit may be used in future publications,
          exhibitions, or screenings.
        </small>
        <button type="button" className="welcome-go" onClick={dismiss}>
          Begin
        </button>
      </div>
    </div>
  )
}
