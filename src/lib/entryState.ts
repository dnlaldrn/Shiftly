import type { DayEntry } from './pay'

export type EntryValues = { status: 'rest' | 'worked'; timeIn: string | null; timeOut: string | null }

export function isUnsaved(entry: DayEntry | undefined, status: DayEntry['status'] | undefined, timeIn: string, timeOut: string): boolean {
  if (!status) return false
  if (!entry || status !== entry.status) return true
  return status === 'worked' && (timeIn !== entry.timeIn?.slice(0, 5) || timeOut !== entry.timeOut?.slice(0, 5))
}

export function entryChanges(existing: DayEntry | undefined, values: EntryValues, rate: number) {
  const row = { status: values.status, time_in: values.timeIn, time_out: values.timeOut }
  // Worked days keep their rate so a raise never changes them. A rest day pays nothing, so it has no rate to protect.
  const needsRate = !existing || (existing.status === 'rest' && values.status === 'worked')
  return needsRate ? { ...row, hourly_rate: rate } : row
}
