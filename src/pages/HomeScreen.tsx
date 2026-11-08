import { ArrowRight, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import Brand from '../components/Brand'
import { Skeleton } from '../components/Skeleton'
import { supabase } from '../lib/supabase'

const Christmas = lazy(() => import('../components/Christmas'))

type Stats = { users: number; logs: number }

export default function HomeScreen({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  // undefined while loading, null when it failed: the strip then disappears instead of showing an error.
  const [stats, setStats] = useState<Stats | null | undefined>(undefined)

  useEffect(() => {
    supabase.rpc('app_stats').then(({ data }) => setStats((data as Stats | null) ?? null))
  }, [])

  return (
    <main className="home">
      <Suspense fallback={null}><Christmas /></Suspense>
      <header className="top">
        <Brand />
        <button onClick={onSignIn}>Sign in</button>
      </header>

      <section className="home-hero">
        <h1>Know your pay <span>before payday.</span></h1>
        <p className="home-lead">
          Log your shifts in seconds and Shiftly does the math: overtime, night differential and
          holiday pay, tallied every cut-off. No spreadsheets, no surprises.
        </p>
        <button className="primary home-cta" onClick={onGetStarted}>
          Get started<ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>

      {stats !== null && (
        <dl className="home-stats" aria-busy={stats === undefined}>
          <div>
            <dt><Users size={16} aria-hidden="true" />Active Users</dt>
            <dd>{stats ? `${stats.users.toLocaleString()}+` : <Skeleton width="3.5ch" />}</dd>
          </div>
          <div>
            <dt>Time Logs</dt>
            <dd>{stats ? `${stats.logs.toLocaleString()}+` : <Skeleton width="3.5ch" />}</dd>
          </div>
        </dl>
      )}

      <footer className="home-footer">
        This website is designed and developed by <strong>Daniel Manjares</strong>
      </footer>
    </main>
  )
}
