import { Clock3, Moon, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import DayDialog, { HolidayTag } from './DayDialog'
import { formatDate, formatMoney, formatTime } from '../lib/format'
import { computeDay } from '../lib/pay'
import type { DayEntry } from '../lib/pay'

type Props = {
  userId: string
  date: string
  isToday: boolean
  entry?: DayEntry
  previous?: DayEntry
  next?: DayEntry
  rate: number
  currency: string
  onChanged: () => Promise<void>
  onUnsaved: (date: string, unsaved: boolean) => void
}

function Summary({ entry }: { entry?: DayEntry }) {
  if (!entry) return <><Plus size={16} aria-hidden="true" />Add entry</>
  if (entry.status === 'rest' || !entry.timeIn || !entry.timeOut) return <><Moon size={16} aria-hidden="true" />Rest</>
  return <><Clock3 size={16} aria-hidden="true" />{formatTime(entry.timeIn)} – {formatTime(entry.timeOut)}</>
}

export default function DayRow({ userId, date, isToday, entry, previous, next, rate, currency, onChanged, onUnsaved }: Props) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  return (
    <li className={isToday ? 'day today' : 'day'}>
      <button ref={button} className="day-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="day-head">
          <strong>{formatDate(date)}</strong>
          {isToday && <span className="tag">Today</span>}
          <HolidayTag date={date} />
        </span>
        <span className={entry ? 'day-summary' : 'day-summary empty'}><Summary entry={entry} /></span>
        <span className="day-pay">
          {entry?.status === 'worked' && formatMoney(computeDay(entry).payCentavos, currency)}
          {entry?.status === 'worked' && entry.hourlyRate !== rate && (
            <small>at {formatMoney(Math.round(entry.hourlyRate * 100), currency)}/hr</small>
          )}
        </span>
      </button>
      {open && (
        <DayDialog
          userId={userId}
          date={date}
          entry={entry}
          previous={previous}
          next={next}
          rate={rate}
          anchor={button.current}
          onChanged={onChanged}
          onUnsaved={onUnsaved}
          onClose={() => setOpen(false)}
        />
      )}
    </li>
  )
}
