import { useState } from 'react'
import type { FormEvent } from 'react'
import ErrorMessage from './ErrorMessage'
import { supabase } from '../lib/supabase'
import { validateRate, validateUsername } from '../lib/validate'

export type Profile = { hourly_rate: number; currency: string }

const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'SAR']

type Props = { userId: string; username: string; profile: Profile | null; onSaved: (profile: Profile) => void }

export default function ProfileForm({ userId, username, profile, onSaved }: Props) {
  const [name, setName] = useState(username)
  const [rate, setRate] = useState(profile ? String(profile.hourly_rate) : '')
  const [currency, setCurrency] = useState(profile?.currency ?? 'PHP')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const invalid = validateUsername(name) ?? validateRate(rate)
    if (invalid) return setError(invalid)
    setBusy(true)
    setError('')
    const saved = { hourly_rate: Number(rate), currency }
    try {
      const { error } = await supabase.from('profiles').upsert({ user_id: userId, ...saved })
      const renamed = !error && name.trim() !== username
      const failure = renamed ? (await supabase.auth.updateUser({ data: { username: name.trim() } })).error : error
      if (failure) setError(failure.message)
      else onSaved(saved)
    } catch {
      setError('Could not reach the server. Your changes were not saved.')
    }
    setBusy(false)
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <label>
        Username
        <input autoComplete="nickname" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Hourly rate
        <input inputMode="decimal" required value={rate} onChange={(e) => setRate(e.target.value)} />
      </label>
      <label>
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((code) => <option key={code}>{code}</option>)}
        </select>
      </label>
      {profile && <p className="hint">A new rate applies to days you add from now on. Saved days keep their rate.</p>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button className="primary" disabled={busy}>Save</button>
    </form>
  )
}
