import { shiftEnd, toMinutes } from './pay'
import type { DayEntry } from './pay'

const MAX_RATE = 9999999999.99 // numeric(12,2)

export function validateRate(value: string): string | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Enter a rate with up to 2 decimal places.'
  const rate = Number(value)
  if (rate <= 0) return 'Rate must be more than zero.'
  if (rate > MAX_RATE) return 'Rate is too large.'
  return null
}

export function validateShift(
  date: string,
  timeIn: string,
  timeOut: string,
  previous?: DayEntry,
  next?: DayEntry,
): string | null {
  if (!timeIn || !timeOut) return 'Enter both time in and time out.'
  if (toMinutes(timeIn) === toMinutes(timeOut)) return 'Time in and time out cannot be the same.'

  const previousEnd = previous && shiftEnd(previous)
  if (previousEnd?.date === date && previousEnd.minute > toMinutes(timeIn)) {
    return "This shift starts before the previous day's shift ends."
  }

  const end = shiftEnd({ date, status: 'worked', timeIn, timeOut, hourlyRate: 0 })
  if (next?.status === 'worked' && next.timeIn && end?.date === next.date && end.minute > toMinutes(next.timeIn)) {
    return "This shift runs into the next day's shift."
  }
  return null
}
