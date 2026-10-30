import { Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent, SyntheticEvent } from 'react'
import { clearEntry, saveEntry } from '../lib/entries'
import { isUnsaved } from '../lib/entryState'
import ErrorMessage from './ErrorMessage'
import { formatDate } from '../lib/format'
import { holidayOn } from '../lib/holidays'
import type { DayEntry } from '../lib/pay'
import { validateShift } from '../lib/validate'

type Props = {
  userId: string
  date: string
  entry?: DayEntry
  previous?: DayEntry
  next?: DayEntry
  rate: number
  anchor: HTMLElement | null
  onChanged: () => Promise<void>
  onUnsaved: (date: string, unsaved: boolean) => void
  onClose: () => void
}

const HOLIDAY_LABELS = {
  regular: 'Regular holiday',
  special: 'Special non-working day',
  special_working: 'Special working day',
  double: 'Double holiday',
}

export function HolidayTag({ date }: { date: string }) {
  const holiday = holidayOn(date)
  if (!holiday) return null
  return <span className={`tag holiday-${holiday.type}`}>{holiday.name} · {HOLIDAY_LABELS[holiday.type]}</span>
}

export default function DayDialog({ userId, date, entry, previous, next, rate, anchor, onChanged, onUnsaved, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState(entry?.status)
  const [timeIn, setTimeIn] = useState(entry?.timeIn?.slice(0, 5) ?? '')
  const [timeOut, setTimeOut] = useState(entry?.timeOut?.slice(0, 5) ?? '')
  const [confirming, setConfirming] = useState<'clear' | 'discard' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const unsaved = isUnsaved(entry, status, timeIn, timeOut)
  const titleId = `day-title-${date}`

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    onUnsaved(date, unsaved)
    return () => onUnsaved(date, false)
  }, [date, unsaved, onUnsaved])

  // Stays beside its row, flipping above it near the bottom. The phone layout ignores these values.
  useLayoutEffect(() => {
    const box = dialog.current
    if (!box || !anchor) return
    const row = anchor.getBoundingClientRect()
    const below = row.bottom + 8
    const fits = below + box.offsetHeight <= window.innerHeight - 16
    const top = fits ? below : row.top - box.offsetHeight - 8
    box.style.setProperty('--top', `${Math.max(16, top)}px`)
    box.style.setProperty('--left', `${Math.min(row.left, window.innerWidth - box.offsetWidth - 16)}px`)
  }, [anchor, status, error, confirming])

  function requestClose() {
    if (unsaved) setConfirming('discard')
    else dialog.current?.close()
  }

  function dismiss(event: SyntheticEvent) {
    event.preventDefault()
    if (confirming) setConfirming(null)
    else requestClose()
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await onChanged()
      dialog.current?.close()
    } catch (failure) {
      setError(`Not saved: ${failure instanceof Error ? failure.message : 'try again.'}`)
      setConfirming(null)
      setBusy(false)
    }
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!status) return
    if (status === 'worked') {
      const invalid = validateShift(date, timeIn, timeOut, previous, next)
      if (invalid) return setError(invalid)
    }
    const values = status === 'worked' ? { status, timeIn, timeOut } : { status, timeIn: null, timeOut: null }
    run(() => saveEntry(userId, date, entry, values, rate))
  }

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === dialog.current && !confirming) requestClose()
  }

  return (
    <dialog
      ref={dialog}
      className="day-dialog"
      aria-labelledby={titleId}
      onCancel={dismiss}
      onKeyDown={(event) => {
        // Handled here because the browser's own Esc handling can close past a prevented cancel event.
        if (event.key === 'Escape') dismiss(event)
      }}
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <form className="stack" onSubmit={save}>
        <div className="dialog-head">
          <h2 id={titleId}>{formatDate(date)}</h2>
          <HolidayTag date={date} />
        </div>
        <label>
          Status
          <select value={status ?? ''} onChange={(e) => setStatus(e.target.value as DayEntry['status'])}>
            <option value="" disabled>Choose</option>
            <option value="rest">Rest</option>
            <option value="worked">Worked</option>
          </select>
        </label>
        {status === 'worked' && (
          <div className="time-fields">
            <label>
              Time in
              <input type="time" autoFocus value={timeIn} onChange={(e) => setTimeIn(e.target.value)} />
            </label>
            <label>
              Time out
              <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
            </label>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {confirming ? (
          <div className="dialog-confirm">
            <p>
              {confirming === 'clear'
                ? `Clear ${formatDate(date)}? Its saved hours and rate will be removed.`
                : `Discard your changes to ${formatDate(date)}?`}
            </p>
            <div className="dialog-actions">
              <button type="button" autoFocus disabled={busy} onClick={() => setConfirming(null)}>
                {confirming === 'clear' ? 'Keep' : 'Keep editing'}
              </button>
              {confirming === 'clear' ? (
                <button type="button" className="danger" disabled={busy} onClick={() => run(() => clearEntry(userId, date))}>
                  <Trash2 size={16} aria-hidden="true" />Clear day
                </button>
              ) : (
                <button type="button" className="danger" onClick={() => dialog.current?.close()}>Discard</button>
              )}
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            {entry && (
              <button type="button" className="danger-soft" disabled={busy} onClick={() => setConfirming('clear')}>
                <Trash2 size={16} aria-hidden="true" />Clear
              </button>
            )}
            <button type="button" disabled={busy} onClick={requestClose}>Cancel</button>
            <button className="primary" disabled={busy || !unsaved}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </form>
    </dialog>
  )
}
