import { ChevronLeft, ChevronRight, Settings, Timer, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Brand from '../components/Brand'
import { addDays, countdown, cutoffDays, cutoffFor, manilaToday, shiftCutoff } from '../lib/cutoff'
import type { Cutoff } from '../lib/cutoff'
import DayRow from '../components/DayRow'
import { loadEntries } from '../lib/entries'
import ErrorMessage from '../components/ErrorMessage'
import { formatDate, formatHours, formatMoney } from '../lib/format'
import { computeDay, sumDays } from '../lib/pay'
import type { DayEntry } from '../lib/pay'
import type { Profile } from '../components/ProfileForm'
import { SkeletonDays, SkeletonSummary } from '../components/Skeleton'

const MoneyRain = lazy(() => import('../components/MoneyRain'))

type Props = { userId: string; username: string; profile: Profile; onSettings: () => void }

export default function MainScreen({ userId, username, profile, onSettings }: Props) {
  const [now, setNow] = useState(() => new Date())
  const today = manilaToday(now)
  const [cutoff, setCutoff] = useState(() => cutoffFor(today))
  const [entries, setEntries] = useState<Map<string, DayEntry>>(new Map())
  const [loadedCutoff, setLoadedCutoff] = useState<Cutoff | null>(null)
  const [loadError, setLoadError] = useState('')
  const latestLoad = useRef(0)
  const unsavedDays = useRef(new Set<string>())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsavedDays.current.size > 0) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const markUnsaved = useCallback((date: string, unsaved: boolean) => {
    if (unsaved) unsavedDays.current.add(date)
    else unsavedDays.current.delete(date)
  }, [])

  // Loads one day past each end so overlap checks reach across cut-offs.
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    try {
      const rows = await loadEntries(addDays(cutoff.start, -1), addDays(cutoff.end, 1))
      if (id !== latestLoad.current) return
      setEntries(new Map(rows.map((row) => [row.date, row])))
      setLoadedCutoff(cutoff)
      setLoadError('')
    } catch {
      if (id === latestLoad.current) setLoadError('Could not load your entries. Check your connection and try again.')
    }
  }, [cutoff])

  useEffect(() => {
    load()
  }, [load])

  const days = cutoffDays(cutoff)
  const pays = days.flatMap((date) => {
    const entry = entries.get(date)
    return entry ? [computeDay(entry)] : []
  })
  const totals = sumDays(pays)
  const missingYears = [...new Set(pays.flatMap((pay) => pay.missingHolidayYears))]
  const left = countdown(cutoffFor(today), now)
  const loading = loadedCutoff !== cutoff && !loadError

  return (
    <main>
      <header className="top">
        <Brand />
        <button onClick={onSettings}><Settings size={16} aria-hidden="true" />Settings</button>
      </header>
      <h1>{username ? `Hi, ${username}` : 'Hi there'}</h1>

      <section className="card countdown" aria-label="Time left in this cut-off">
        <span><Timer size={18} aria-hidden="true" />Current cut-off ends in</span>
        <strong>{left.days}d {left.hours}h {left.minutes}m</strong>
      </section>

      <nav className="period">
        <button className="icon-button" aria-label="Previous cut-off" onClick={() => setCutoff(shiftCutoff(cutoff, -1))}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2>{formatDate(cutoff.start)} – {formatDate(cutoff.end)}</h2>
        <button className="icon-button" aria-label="Next cut-off" onClick={() => setCutoff(shiftCutoff(cutoff, 1))}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </nav>

      <div className="summary-wrap">
        <Suspense fallback={null}><MoneyRain currency={profile.currency} /></Suspense>
        {loading ? <SkeletonSummary /> : (
        <section className="summary" aria-label="Cut-off summary">
          <div className="total"><span>Gross pay</span><strong>{formatMoney(totals.payCentavos, profile.currency)}</strong></div>
          <div><span>Regular hours</span><strong>{formatHours(totals.regularMinutes)}</strong></div>
          <div><span>Overtime hours</span><strong>{formatHours(totals.overtimeMinutes)}</strong></div>
          <div><span>Night hours</span><strong>{formatHours(totals.nightMinutes)}</strong></div>
        </section>
        )}
      </div>

      {missingYears.length > 0 && (
        <p className="warning" role="alert">
          <TriangleAlert size={16} aria-hidden="true" />
          The holiday list for {missingYears.join(', ')} has not been added, so those dates are paid at the ordinary rate.
        </p>
      )}
      {loadError && <ErrorMessage>{loadError}</ErrorMessage>}

      {loading ? <SkeletonDays count={days.length} /> : (
        <ul className="days">
          {days.map((date) => {
            const entry = entries.get(date)
            return (
              <DayRow
                key={date}
                userId={userId}
                date={date}
                isToday={date === today}
                entry={entry}
                previous={entries.get(addDays(date, -1))}
                next={entries.get(addDays(date, 1))}
                rate={profile.hourly_rate}
                currency={profile.currency}
                onChanged={load}
                onUnsaved={markUnsaved}
              />
            )
          })}
        </ul>
      )}
    </main>
  )
}
