import { useState } from 'react'
import { clearEntry, saveEntry } from './entries'
import { formatDate, formatMoney } from './format'
import { holidayOn } from './holidays'
import { computeDay } from './pay'
import type { DayEntry } from './pay'
import { validateShift } from './validate'

type Props = {
  userId: string
  date: string
  isToday: boolean
  entry?: DayEntry
  previous?: DayEntry
  next?: DayEntry
  rate: number
  currency: string
  onChanged: () => void
}

const HOLIDAY_LABELS = {
  regular: 'Regular holiday',
  special: 'Special non-working day',
  special_working: 'Special working day',
  double: 'Double holiday',
}

export default function DayRow({ userId, date, isToday, entry, previous, next, rate, currency, onChanged }: Props) {
  const [status, setStatus] = useState(entry?.status)
  const [timeIn, setTimeIn] = useState(entry?.timeIn?.slice(0, 5) ?? '')
  const [timeOut, setTimeOut] = useState(entry?.timeOut?.slice(0, 5) ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const holiday = holidayOn(date)
  const name = `status-${date}`

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      onChanged()
    } catch (failure) {
      setError(`Not saved: ${failure instanceof Error ? failure.message : 'try again.'}`)
    }
    setBusy(false)
  }

  function save() {
    if (!status) return
    if (status === 'worked') {
      const invalid = validateShift(date, timeIn, timeOut, previous, next)
      if (invalid) return setError(invalid)
    }
    const values = status === 'worked' ? { status, timeIn, timeOut } : { status, timeIn: null, timeOut: null }
    run(() => saveEntry(userId, date, Boolean(entry), values, rate))
  }

  return (
    <li className={isToday ? 'day today' : 'day'}>
      <div className="day-head">
        <strong>{formatDate(date)}</strong>
        {isToday && <span className="tag">Today</span>}
        {holiday && (
          <span className={`tag holiday-${holiday.type}`}>{holiday.name} · {HOLIDAY_LABELS[holiday.type]}</span>
        )}
      </div>
      <div className="day-controls">
        <fieldset className="choice">
          <legend className="sr-only">{formatDate(date)} status</legend>
          <label><input type="radio" name={name} checked={status === 'rest'} onChange={() => setStatus('rest')} /> Rest</label>
          <label><input type="radio" name={name} checked={status === 'worked'} onChange={() => setStatus('worked')} /> Worked</label>
        </fieldset>
        {status === 'worked' && (
          <>
            <label className="time">In <input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} /></label>
            <label className="time">Out <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} /></label>
          </>
        )}
        <div className="day-actions">
          <button disabled={busy || !status} onClick={save}>Save</button>
          {entry && <button className="link" disabled={busy} onClick={() => run(() => clearEntry(userId, date))}>Clear</button>}
        </div>
        <output className="day-pay">{entry ? formatMoney(computeDay(entry).payCentavos, currency) : ''}</output>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </li>
  )
}
