import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listAdminPins, setPinHidden, type AdminPin } from '../lib/admin'
import { publicUrlFor } from '../lib/pins'

export function AdminPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [magicEmail, setMagicEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [pins, setPins] = useState<AdminPin[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null))
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => sub.data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!email) return
    let cancelled = false
    void (async () => {
      try {
        const list = await listAdminPins()
        if (!cancelled) setPins(list)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load pins')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [email])

  async function sendMagicLink() {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    if (error) setAuthError(error.message)
    else setMagicSent(true)
  }

  async function toggleHidden(pin: AdminPin) {
    setBusy(pin.id)
    try {
      await setPinHidden(pin.id, !pin.hidden)
      setPins((prev) => prev.map((p) => (p.id === pin.id ? { ...p, hidden: !p.hidden } : p)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  if (!email) {
    return (
      <div className="admin-shell">
        <div className="admin-card">
          <h1>Admin</h1>
          <p>Sign in with your allowlisted email.</p>
          {magicSent ? (
            <p className="admin-ok">Magic link sent to {magicEmail}. Check your inbox.</p>
          ) : (
            <>
              <input
                type="email"
                placeholder="you@example.com"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                className="admin-input"
              />
              <button
                type="button"
                className="sheet-submit"
                disabled={!magicEmail.includes('@')}
                onClick={() => void sendMagicLink()}
              >
                Send magic link
              </button>
              {authError && <p className="sheet-error">{authError}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Admin · {email}</h1>
        <button
          type="button"
          className="sheet-cancel"
          onClick={() => void supabase.auth.signOut()}
        >
          Sign out
        </button>
      </header>

      {loadError && <p className="sheet-error">{loadError}</p>}

      <ul className="admin-pin-list">
        {pins.map((pin) => {
          const reportCount = pin.pin_reports?.[0]?.count ?? 0
          return (
            <li key={pin.id} className={pin.hidden ? 'admin-pin hidden' : 'admin-pin'}>
              <div className="admin-pin-meta">
                <span>{new Date(pin.created_at).toLocaleString()}</span>
                <span className="admin-pin-coords">
                  {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                </span>
                {reportCount > 0 && (
                  <span className="admin-pin-reports">{reportCount} report{reportCount === 1 ? '' : 's'}</span>
                )}
                {pin.hidden && <span className="admin-pin-hidden">HIDDEN</span>}
              </div>

              {pin.text && <p className="admin-pin-text">{pin.text}</p>}
              {pin.image_path && (
                <img className="admin-pin-image" src={publicUrlFor(pin.image_path) ?? ''} alt="" />
              )}
              {pin.audio_path && (
                <audio src={publicUrlFor(pin.audio_path) ?? ''} controls preload="metadata" />
              )}

              <button
                type="button"
                className="sheet-cancel"
                disabled={busy === pin.id}
                onClick={() => void toggleHidden(pin)}
              >
                {busy === pin.id ? 'Working…' : pin.hidden ? 'Unhide' : 'Hide'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
