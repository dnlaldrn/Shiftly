import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import AuthScreen from './AuthScreen'
import MainScreen from './MainScreen'
import ProfileForm from './ProfileForm'
import type { Profile } from './ProfileForm'
import { supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [profileError, setProfileError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [settings, setSettings] = useState(false)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfile(undefined)
    setProfileError('')
    if (!userId) return
    let current = true
    supabase
      .from('profiles')
      .select('hourly_rate, currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!current) return
        if (error) setProfileError('Could not load your profile.')
        else setProfile(data && { hourly_rate: Number(data.hourly_rate), currency: data.currency })
      })
    return () => {
      current = false
    }
  }, [userId, attempt])

  if (session === undefined) return <main className="narrow"><p>Loading…</p></main>
  if (recovery || !session || !userId) {
    return <AuthScreen recovery={recovery} onRecovered={() => setRecovery(false)} />
  }
  if (profileError) {
    return (
      <main className="narrow">
        <p className="error" role="alert">{profileError}</p>
        <button onClick={() => setAttempt(attempt + 1)}>Try again</button>
      </main>
    )
  }
  if (profile === undefined) return <main className="narrow"><p>Loading…</p></main>
  if (profile === null) {
    return (
      <main className="narrow">
        <h1>Set up your pay</h1>
        <ProfileForm userId={userId} profile={null} onSaved={setProfile} />
      </main>
    )
  }
  if (settings) {
    return (
      <main className="narrow">
        <header className="top">
          <h1>Settings</h1>
          <button className="link" onClick={() => setSettings(false)}>Back</button>
        </header>
        <ProfileForm
          userId={userId}
          profile={profile}
          onSaved={(saved) => {
            setProfile(saved)
            setSettings(false)
          }}
        />
        <button className="signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </main>
    )
  }
  return <MainScreen userId={userId} profile={profile} onSettings={() => setSettings(true)} />
}
