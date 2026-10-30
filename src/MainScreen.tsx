import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, countdown, cutoffDays, cutoffFor, manilaToday, shiftCutoff } from './cutoff'
import DayRow from './DayRow'
import { loadEntries } from './entries'
import { formatDate, formatHours, formatMoney } from './format'
import { computeDay, sumDays } from './pay'
import type { DayEntry } from './pay'
import type { Profile } from './ProfileForm'

type Props = { userId: string; profile: Profile; onSettings: () => void }

export default function MainScreen({ userId, profile, onSettings }: Props) {
  const [now, setNow] = useState(() => new Date())
  const today = manilaToday(now)
  const [cutoff, setCutoff] = useState(() => cutoffFor(today))
  const [entries, setEntries] = useState<Map<string, DayEntry>>(new Map())
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

  const canLeave = () =>
    unsavedDays.current.size === 0 || window.confirm('You have unsaved days. Leave without saving them?')

  // Loads one day past each end so overlap checks reach across cut-offs.
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    try {
      const rows = await loadEntries(addDays(cutoff.start, -1), addDays(cutoff.end, 1))
      if (id !== latestLoad.current) return
      setEntries(new Map(rows.map((row) => [row.date, row])))
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

  return (
    <main>
      <header className="top">
        <h1>Hour Tracker</h1>
        <button className="link" onClick={() => canLeave() && onSettings()}>Settings</button>
      </header>

      <section className="card countdown" aria-label="Time left in this cut-off">
        <span>Current cut-off ends in</span>
        <strong>{left.days}d {left.hours}h {left.minutes}m</strong>
      </section>

      <nav className="period">
        <button aria-label="Previous cut-off" onClick={() => canLeave() && setCutoff(shiftCutoff(cutoff, -1))}>←</button>
        <h2>{formatDate(cutoff.start)} – {formatDate(cutoff.end)}</h2>
        <button aria-label="Next cut-off" onClick={() => canLeave() && setCutoff(shiftCutoff(cutoff, 1))}>→</button>
      </nav>

      <section className="summary" aria-label="Cut-off summary">
        <div className="total"><span>Gross pay</span><strong>{formatMoney(totals.payCentavos, profile.currency)}</strong></div>
        <div><span>Regular hours</span><strong>{formatHours(totals.regularMinutes)}</strong></div>
        <div><span>Overtime hours</span><strong>{formatHours(totals.overtimeMinutes)}</strong></div>
        <div><span>Night hours</span><strong>{formatHours(totals.nightMinutes)}</strong></div>
      </section>

      {missingYears.length > 0 && (
        <p className="warning" role="alert">
          The holiday list for {missingYears.join(', ')} has not been added, so those dates are paid at the ordinary rate.
        </p>
      )}
      {loadError && <p className="error" role="alert">{loadError}</p>}

      <ul className="days">
        {days.map((date) => {
          const entry = entries.get(date)
          return (
            <DayRow
              key={`${date}|${entry?.status}|${entry?.timeIn}|${entry?.timeOut}`}
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
    </main>
  )
}
