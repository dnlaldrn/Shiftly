import { ArrowLeft, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import AuthScreen from './pages/AuthScreen'
import ErrorMessage from './components/ErrorMessage'
import MainScreen from './pages/MainScreen'
import ProfileForm from './components/ProfileForm'
import type { Profile } from './components/ProfileForm'
import { DashboardSkeleton } from './components/Skeleton'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [profileError, setProfileError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [settings, setSettings] = useState(false)
  const userId = session?.user.id
  const username: string = session?.user.user_metadata.username ?? ''

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

  if (session === undefined) return null
  if (recovery || !session || !userId) {
    return <AuthScreen recovery={recovery} onRecovered={() => setRecovery(false)} />
  }
  if (profileError) {
    return (
      <main className="narrow">
        <ErrorMessage>{profileError}</ErrorMessage>
        <button onClick={() => setAttempt(attempt + 1)}>Try again</button>
      </main>
    )
  }
  if (profile === undefined) return <DashboardSkeleton />
  if (profile === null) {
    return (
      <main className="narrow">
        <h1>Set up your pay</h1>
        <ProfileForm userId={userId} username={username} profile={null} onSaved={setProfile} />
      </main>
    )
  }
  if (settings) {
    return (
      <main className="narrow">
        <header className="top">
          <h1>Settings</h1>
          <button onClick={() => setSettings(false)}><ArrowLeft size={16} aria-hidden="true" />Back</button>
        </header>
        <ProfileForm
          userId={userId}
          username={username}
          profile={profile}
          onSaved={(saved) => {
            setProfile(saved)
            setSettings(false)
          }}
        />
        <button className="signout danger-soft" onClick={() => supabase.auth.signOut()}>
          <LogOut size={16} aria-hidden="true" />Sign out
        </button>
      </main>
    )
  }
  return <MainScreen userId={userId} username={username} profile={profile} onSettings={() => setSettings(true)} />
}
