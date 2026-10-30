import { addDays } from './cutoff'
import { hasHolidayList, holidayOn } from './holidays'
import type { Holiday, HolidayType } from './holidays'

export type DayEntry = {
  date: string
  status: 'rest' | 'worked'
  timeIn: string | null
  timeOut: string | null
  hourlyRate: number
}

export type DayPay = {
  regularMinutes: number
  overtimeMinutes: number
  nightMinutes: number
  payCentavos: number
  missingHolidayYears: number[]
}

const REGULAR_MINUTES = 480
const NIGHT_START = 1320 // 10:00 PM
const NIGHT_END = 360 // 6:00 AM

// Thousandths, so money stays in integers. Every value stays whole after the night x 1.10.
const ORDINARY = { regular: 1000, overtime: 1250 }
const RATES: Record<HolidayType, { regular: number; overtime: number }> = {
  special_working: ORDINARY,
  special: { regular: 1300, overtime: 1690 },
  regular: { regular: 2000, overtime: 2600 },
  double: { regular: 3000, overtime: 3900 },
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function computeDay(entry: DayEntry, lookup: (date: string) => Holiday | undefined = holidayOn): DayPay {
  const pay: DayPay = { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, payCentavos: 0, missingHolidayYears: [] }
  if (entry.status !== 'worked' || !entry.timeIn || !entry.timeOut) return pay

  const start = toMinutes(entry.timeIn)
  const length = (toMinutes(entry.timeOut) - start + 1440) % 1440
  const rateCentavos = Math.round(entry.hourlyRate * 100)
  let total = 0

  for (let i = 0; i < length; i++) {
    const date = addDays(entry.date, Math.floor((start + i) / 1440))
    const timeOfDay = (start + i) % 1440
    const holiday = lookup(date)
    const rates = holiday ? RATES[holiday.type] : ORDINARY
    const isOvertime = i >= REGULAR_MINUTES
    const isNight = timeOfDay >= NIGHT_START || timeOfDay < NIGHT_END
    const thousandths = isOvertime ? rates.overtime : rates.regular

    if (isOvertime) pay.overtimeMinutes++
    else pay.regularMinutes++
    if (isNight) pay.nightMinutes++
    total += rateCentavos * (isNight ? (thousandths * 11) / 10 : thousandths)

    const year = Number(date.slice(0, 4))
    if (!hasHolidayList(year) && !pay.missingHolidayYears.includes(year)) pay.missingHolidayYears.push(year)
  }

  pay.payCentavos = Math.floor((total + 30000) / 60000)
  return pay
}

export function sumDays(days: DayPay[]): Omit<DayPay, 'missingHolidayYears'> {
  const totals = { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, payCentavos: 0 }
  for (const day of days) {
    totals.regularMinutes += day.regularMinutes
    totals.overtimeMinutes += day.overtimeMinutes
    totals.nightMinutes += day.nightMinutes
    totals.payCentavos += day.payCentavos
  }
  return totals
}

export function shiftEnd(entry: DayEntry): { date: string; minute: number } | null {
  if (entry.status !== 'worked' || !entry.timeIn || !entry.timeOut) return null
  const minute = toMinutes(entry.timeOut)
  return { date: minute <= toMinutes(entry.timeIn) ? addDays(entry.date, 1) : entry.date, minute }
}
