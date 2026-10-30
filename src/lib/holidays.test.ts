import { describe, expect, it } from 'vitest'
import { HOLIDAYS, hasHolidayList, holidayOn } from './holidays'
import type { HolidayType } from './holidays'

const count = (year: string, type: HolidayType) =>
  Object.entries(HOLIDAYS).filter(([date, holiday]) => date.startsWith(year) && holiday.type === type).length

describe('holidayOn', () => {
  it('includes separately proclaimed Eid dates', () => {
    expect(holidayOn('2026-03-20')).toEqual({ name: "Eid'l Fitr", type: 'regular' })
    expect(holidayOn('2026-05-27')?.type).toBe('regular')
  })
  it('classifies special days', () => {
    expect(holidayOn('2026-08-21')?.type).toBe('special')
    expect(holidayOn('2026-02-25')?.type).toBe('special_working')
    expect(holidayOn('2027-03-27')?.type).toBe('special')
  })
  it('returns nothing for an ordinary day', () => {
    expect(holidayOn('2026-10-30')).toBeUndefined()
  })
})

it('knows which years have a list', () => {
  expect(hasHolidayList(2026)).toBe(true)
  expect(hasHolidayList(2027)).toBe(true)
  expect(hasHolidayList(2028)).toBe(false)
})

it('has the proclaimed number of dates', () => {
  expect([count('2026', 'regular'), count('2026', 'special'), count('2026', 'special_working')]).toEqual([12, 8, 1])
  expect([count('2027', 'regular'), count('2027', 'special'), count('2027', 'special_working')]).toEqual([10, 8, 1])
})
