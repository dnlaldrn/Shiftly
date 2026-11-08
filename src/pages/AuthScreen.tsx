import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import Brand from '../components/Brand'
import ErrorMessage from '../components/ErrorMessage'
import { supabase } from '../lib/supabase'
import { validateUsername } from '../lib/validate'

type Mode = 'signin' | 'signup' | 'forgot'

const TITLES = { signin: 'Sign in', signup: 'Create account', forgot: 'Reset password' }

type Props = { recovery: boolean; onRecovered: () => void; onBack?: () => void; startMode?: Mode }

export default function AuthScreen({ recovery, onRecovered, onBack, startMode = 'signin' }: Props) {
  const [mode, setMode] = useState<Mode>(startMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const passwordId = useId()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submitAuth() {
    if (mode === 'signin') {
      return (await supabase.auth.signInWithPassword({ email, password })).error
    }
    if (mode === 'signup') {
      const invalid = validateUsername(username)
      if (invalid) return { message: invalid }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      })
      if (!error && !data.session) setNotice('Check your email to confirm your account.')
      return error
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (!error) setNotice('If that email has an account, a reset link is on its way.')
    return error
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const failure = recovery ? (await supabase.auth.updateUser({ password })).error : await submitAuth()
      if (failure) setError(failure.message)
      else if (recovery) onRecovered()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <main className="narrow">
      <header className="top">
        <h1><Brand /></h1>
        {onBack && <button onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back</button>}
      </header>
      <form className="card stack" onSubmit={submit}>
        <h2>{recovery ? 'Set a new password' : TITLES[mode]}</h2>
        {!recovery && mode === 'signup' && (
          <label>
            Username
            <input autoComplete="nickname" required maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
        )}
        {!recovery && (
          <label>
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {(recovery || mode !== 'forgot') && (
          // Not wrapped in its label like the other fields, because a label may not contain the toggle button.
          <div className="field">
            <label htmlFor={passwordId}>{recovery ? 'New password' : 'Password'}</label>
            <div className="password-field">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' && !recovery ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label="Show password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <button className="primary" disabled={busy}>
          {recovery ? 'Save password' : mode === 'forgot' ? 'Send reset link' : TITLES[mode]}
        </button>
        {!recovery && (
          <div className="links">
            {mode !== 'signin' && (
              <button type="button" onClick={() => switchMode('signin')}><LogIn size={16} aria-hidden="true" />Sign in</button>
            )}
            {mode !== 'signup' && (
              <button type="button" onClick={() => switchMode('signup')}><UserPlus size={16} aria-hidden="true" />Create account</button>
            )}
            {mode !== 'forgot' && (
              <button type="button" onClick={() => switchMode('forgot')}><KeyRound size={16} aria-hidden="true" />Forgot password?</button>
            )}
          </div>
        )}
      </form>
    </main>
  )
}
