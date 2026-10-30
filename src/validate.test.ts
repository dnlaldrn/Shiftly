import { describe, expect, it } from 'vitest'
import { validateRate, validateShift } from './validate'
import type { DayEntry } from './pay'

describe('validateRate', () => {
  it.each(['0', '-1', 'abc', '', '10000000000', '100.505'])('rejects %s', (value) => {
    expect(validateRate(value)).not.toBeNull()
  })
  it.each(['100.50', '9999999999.99', '95'])('accepts %s', (value) => {
    expect(validateRate(value)).toBeNull()
  })
})

describe('validateShift', () => {
  const overnight: DayEntry = { date: '2026-10-29', status: 'worked', timeIn: '22:00:00', timeOut: '06:00:00', hourlyRate: 100 }
  const earlyNext: DayEntry = { date: '2026-10-31', status: 'worked', timeIn: '05:00:00', timeOut: '13:00:00', hourlyRate: 100 }
  const rest: DayEntry = { date: '2026-10-29', status: 'rest', timeIn: null, timeOut: null, hourlyRate: 100 }

  it('rejects equal times', () => {
    expect(validateShift('2026-10-30', '09:00', '09:00')).not.toBeNull()
  })
  it('rejects equal times with different precision', () => {
    expect(validateShift('2026-10-30', '09:00:00', '09:00')).not.toBeNull()
  })
  it('rejects a missing time', () => {
    expect(validateShift('2026-10-30', '', '17:00')).not.toBeNull()
    expect(validateShift('2026-10-30', '09:00', '')).not.toBeNull()
  })
  it('accepts a normal shift', () => {
    expect(validateShift('2026-10-30', '09:00', '17:00')).toBeNull()
  })
  it('rejects a start before the previous overnight shift ends', () => {
    expect(validateShift('2026-10-30', '05:00', '13:00', overnight)).not.toBeNull()
  })
  it('accepts a start as the previous shift ends', () => {
    expect(validateShift('2026-10-30', '06:00', '13:00', overnight)).toBeNull()
  })
  it('rejects an overnight shift running into the next shift', () => {
    expect(validateShift('2026-10-30', '22:00', '06:00', undefined, earlyNext)).not.toBeNull()
  })
  it('accepts an overnight shift ending as the next starts', () => {
    expect(validateShift('2026-10-30', '22:00', '05:00', undefined, earlyNext)).toBeNull()
  })
  it('ignores rest neighbors', () => {
    expect(validateShift('2026-10-30', '05:00', '13:00', rest)).toBeNull()
  })
  it('ignores a next day shift when this shift ends the same day', () => {
    expect(validateShift('2026-10-30', '09:00', '17:00', undefined, earlyNext)).toBeNull()
  })
})
