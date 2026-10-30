import { describe, expect, it } from 'vitest'
import { computeDay, shiftEnd, sumDays } from './pay'
import type { DayEntry, DayPay } from './pay'

const worked = (date: string, timeIn: string, timeOut: string, hourlyRate = 100): DayEntry => ({
  date,
  status: 'worked',
  timeIn,
  timeOut,
  hourlyRate,
})

describe('computeDay pay', () => {
  it.each([
    ['spec worked example', '2026-10-30', '14:00', '00:00', 100, 107500],
    ['ordinary with overtime', '2026-10-29', '09:00', '19:00', 100, 105000],
    ['special working day with overtime', '2026-02-25', '09:00', '19:00', 100, 105000],
    ['special non-working day with overtime', '2026-08-21', '09:00', '19:00', 100, 137800],
    ['regular holiday with overtime', '2026-12-25', '09:00', '19:00', 100, 212000],
    ['night starts at 10:00 PM', '2026-10-29', '21:00', '23:00', 100, 21000],
    ['night ends at 6:00 AM', '2026-10-29', '05:00', '07:00', 100, 21000],
    ['into a holiday at midnight', '2026-11-29', '22:00', '06:00', 100, 154000],
    ['out of a holiday at midnight', '2026-11-30', '22:00', '02:00', 100, 66000],
    ['Dec 31 into Jan 1', '2026-12-31', '23:00', '01:00', 100, 36300],
    ['half-up that fails with floats', '2026-10-29', '23:00', '00:00', 1.15, 127],
    ['HH:MM:SS from Postgres', '2026-10-30', '14:00:00', '00:00:00', 100, 107500],
  ])('%s', (_name, date, timeIn, timeOut, rate, centavos) => {
    expect(computeDay(worked(date, timeIn, timeOut, rate)).payCentavos).toBe(centavos)
  })

  it('applies double holiday rates', () => {
    const pay = computeDay(worked('2026-10-29', '09:00', '19:00'), () => ({ name: 'x', type: 'double' }))
    expect(pay.payCentavos).toBe(318000)
  })

  it('pays nothing for rest on a holiday', () => {
    const rest: DayEntry = { date: '2026-12-25', status: 'rest', timeIn: null, timeOut: null, hourlyRate: 100 }
    expect(computeDay(rest).payCentavos).toBe(0)
  })
})

it('splits regular, overtime and night minutes', () => {
  expect(computeDay(worked('2026-10-30', '14:00', '00:00'))).toMatchObject({
    regularMinutes: 480,
    overtimeMinutes: 120,
    nightMinutes: 120,
  })
})

describe('missing holiday lists', () => {
  it('reports the year of the shift', () => {
    expect(computeDay(worked('2028-01-05', '09:00', '17:00')).missingHolidayYears).toEqual([2028])
  })
  it('reports a year reached after midnight', () => {
    expect(computeDay(worked('2027-12-31', '23:00', '01:00')).missingHolidayYears).toEqual([2028])
  })
  it('reports nothing for covered years', () => {
    expect(computeDay(worked('2026-10-29', '09:00', '17:00')).missingHolidayYears).toEqual([])
  })
})

it('adds up days', () => {
  const day = (n: number): DayPay => ({
    regularMinutes: n,
    overtimeMinutes: n,
    nightMinutes: n,
    payCentavos: n,
    missingHolidayYears: [],
  })
  expect(sumDays([day(1), day(2)])).toEqual({ regularMinutes: 3, overtimeMinutes: 3, nightMinutes: 3, payCentavos: 3 })
})

describe('shiftEnd', () => {
  it('finds the end of an overnight shift', () => {
    expect(shiftEnd(worked('2026-10-30', '22:00', '06:00'))).toEqual({ date: '2026-10-31', minute: 360 })
  })
  it('is null for rest', () => {
    expect(shiftEnd({ date: '2026-10-30', status: 'rest', timeIn: null, timeOut: null, hourlyRate: 100 })).toBeNull()
  })
})
