import { describe, expect, it } from 'vitest'
import { addDays, countdown, cutoffDays, cutoffFor, manilaToday, shiftCutoff } from './cutoff'

describe('cutoffFor', () => {
  it('puts the 15th in the first cut-off', () => {
    expect(cutoffFor('2026-10-15')).toEqual({ start: '2026-10-01', end: '2026-10-15' })
  })
  it('puts the 16th in the second cut-off', () => {
    expect(cutoffFor('2026-10-16')).toEqual({ start: '2026-10-16', end: '2026-10-31' })
  })
  it('ends on the 30th in a 30-day month', () => {
    expect(cutoffFor('2026-11-30')).toEqual({ start: '2026-11-16', end: '2026-11-30' })
  })
  it('ends on the 28th in a non-leap February', () => {
    expect(cutoffFor('2026-02-20').end).toBe('2026-02-28')
  })
  it('ends on the 29th in a leap February', () => {
    expect(cutoffFor('2028-02-20').end).toBe('2028-02-29')
  })
})

describe('shiftCutoff', () => {
  it('moves back into the previous month', () => {
    expect(shiftCutoff({ start: '2026-10-01', end: '2026-10-15' }, -1)).toEqual({ start: '2026-09-16', end: '2026-09-30' })
  })
  it('moves forward into the next year', () => {
    expect(shiftCutoff({ start: '2026-12-16', end: '2026-12-31' }, 1)).toEqual({ start: '2027-01-01', end: '2027-01-15' })
  })
})

it('lists every day of a cut-off', () => {
  expect(cutoffDays({ start: '2026-02-16', end: '2026-02-28' })).toHaveLength(13)
})

it('adds days across a year boundary', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
})

it('uses the Manila date, not the device date', () => {
  expect(manilaToday(new Date('2026-10-30T16:30:00Z'))).toBe('2026-10-31')
})

describe('countdown', () => {
  const cutoff = { start: '2026-10-16', end: '2026-10-31' }
  it('counts to midnight after the last day in Manila', () => {
    expect(countdown(cutoff, new Date('2026-10-30T04:00:00Z'))).toEqual({ days: 1, hours: 12, minutes: 0 })
  })
  it('never goes negative', () => {
    expect(countdown(cutoff, new Date('2026-11-01T00:00:00Z'))).toEqual({ days: 0, hours: 0, minutes: 0 })
  })
})
