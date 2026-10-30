import { describe, expect, it } from 'vitest'
import { entryChanges, isUnsaved } from './entryState'
import type { DayEntry } from './pay'

const worked: DayEntry = { date: '2026-10-29', status: 'worked', timeIn: '09:00:00', timeOut: '17:00:00', hourlyRate: 100 }
const rest: DayEntry = { date: '2026-10-29', status: 'rest', timeIn: null, timeOut: null, hourlyRate: 100 }

describe('isUnsaved', () => {
  it('is false for an untouched blank day', () => {
    expect(isUnsaved(undefined, undefined, '', '')).toBe(false)
  })
  it('is true once a blank day has a choice', () => {
    expect(isUnsaved(undefined, 'rest', '', '')).toBe(true)
  })
  it('is false when values match, despite Postgres seconds', () => {
    expect(isUnsaved(worked, 'worked', '09:00', '17:00')).toBe(false)
  })
  it('is true when a time changes', () => {
    expect(isUnsaved(worked, 'worked', '09:00', '19:00')).toBe(true)
  })
  it('is true when the status changes', () => {
    expect(isUnsaved(worked, 'rest', '09:00', '17:00')).toBe(true)
  })
  it('ignores leftover times on a rest day', () => {
    expect(isUnsaved(rest, 'rest', '09:00', '')).toBe(false)
  })
})

describe('entryChanges', () => {
  const values = { status: 'worked', timeIn: '09:00', timeOut: '17:00' } as const
  const row = { status: 'worked', time_in: '09:00', time_out: '17:00' }

  it('stores the current rate on a new day', () => {
    expect(entryChanges(undefined, values, 120)).toEqual({ ...row, hourly_rate: 120 })
  })
  it('keeps the rate when a worked day is edited', () => {
    expect(entryChanges(worked, values, 120)).toEqual(row)
  })
  it('uses the current rate when a rest day becomes worked', () => {
    expect(entryChanges(rest, values, 120)).toEqual({ ...row, hourly_rate: 120 })
  })
  it('keeps the rate when a worked day becomes rest', () => {
    expect(entryChanges(worked, { status: 'rest', timeIn: null, timeOut: null }, 120))
      .toEqual({ status: 'rest', time_in: null, time_out: null })
  })
})
