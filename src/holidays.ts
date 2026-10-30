export type HolidayType = 'regular' | 'special' | 'special_working' | 'double'
export type Holiday = { name: string; type: HolidayType }

const regular = (name: string): Holiday => ({ name, type: 'regular' })
const special = (name: string): Holiday => ({ name, type: 'special' })
const specialWorking = (name: string): Holiday => ({ name, type: 'special_working' })

// Sources: Proclamations 1006 s.2025, 1189 and 1264 s.2026 (2026) and 1427 s.2026 (2027).
// shortcut: the list is updated by hand, add each new year's dates and any late proclamations here.
export const HOLIDAYS: Record<string, Holiday> = {
  '2026-01-01': regular("New Year's Day"),
  '2026-02-17': special('Chinese New Year'),
  '2026-02-25': specialWorking('EDSA People Power Anniversary'),
  '2026-03-20': regular("Eid'l Fitr"),
  '2026-04-02': regular('Maundy Thursday'),
  '2026-04-03': regular('Good Friday'),
  '2026-04-04': special('Black Saturday'),
  '2026-04-09': regular('Araw ng Kagitingan'),
  '2026-05-01': regular('Labor Day'),
  '2026-05-27': regular("Eid'l Adha"),
  '2026-06-12': regular('Independence Day'),
  '2026-08-21': special('Ninoy Aquino Day'),
  '2026-08-31': regular('National Heroes Day'),
  '2026-11-01': special("All Saints' Day"),
  '2026-11-02': special("All Souls' Day"),
  '2026-11-30': regular('Bonifacio Day'),
  '2026-12-08': special('Feast of the Immaculate Conception'),
  '2026-12-24': special('Christmas Eve'),
  '2026-12-25': regular('Christmas Day'),
  '2026-12-30': regular('Rizal Day'),
  '2026-12-31': special('Last Day of the Year'),

  '2027-01-01': regular("New Year's Day"),
  '2027-02-06': special('Chinese New Year'),
  '2027-02-25': specialWorking('EDSA People Power Anniversary'),
  '2027-03-25': regular('Maundy Thursday'),
  '2027-03-26': regular('Good Friday'),
  '2027-03-27': special('Black Saturday'),
  '2027-04-09': regular('Araw ng Kagitingan'),
  '2027-05-01': regular('Labor Day'),
  '2027-06-12': regular('Independence Day'),
  '2027-08-21': special('Ninoy Aquino Day'),
  '2027-08-30': regular('National Heroes Day'),
  '2027-11-01': special("All Saints' Day"),
  '2027-11-02': special("All Souls' Day"),
  '2027-11-30': regular('Bonifacio Day'),
  '2027-12-08': special('Feast of the Immaculate Conception'),
  '2027-12-24': special('Christmas Eve'),
  '2027-12-25': regular('Christmas Day'),
  '2027-12-30': regular('Rizal Day'),
  '2027-12-31': special('Last Day of the Year'),
}

export function holidayOn(date: string): Holiday | undefined {
  return HOLIDAYS[date]
}

export function hasHolidayList(year: number): boolean {
  return Object.keys(HOLIDAYS).some((date) => date.startsWith(`${year}-`))
}
