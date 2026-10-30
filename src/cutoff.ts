export type Cutoff = { start: string; end: string }

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`)
const toDate = (utc: Date) => utc.toISOString().slice(0, 10)

export function addDays(date: string, days: number): string {
  const utc = toUtc(date)
  utc.setUTCDate(utc.getUTCDate() + days)
  return toDate(utc)
}

export function manilaToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
}

export function cutoffFor(date: string): Cutoff {
  const month = date.slice(0, 7)
  if (Number(date.slice(8)) <= 15) return { start: `${month}-01`, end: `${month}-15` }
  const nextMonth = addDays(`${month}-28`, 4).slice(0, 7)
  return { start: `${month}-16`, end: addDays(`${nextMonth}-01`, -1) }
}

export function shiftCutoff(cutoff: Cutoff, direction: -1 | 1): Cutoff {
  return cutoffFor(direction === 1 ? addDays(cutoff.end, 1) : addDays(cutoff.start, -1))
}

export function cutoffDays(cutoff: Cutoff): string[] {
  const days: string[] = []
  for (let day = cutoff.start; day <= cutoff.end; day = addDays(day, 1)) days.push(day)
  return days
}

export function countdown(cutoff: Cutoff, now: Date): { days: number; hours: number; minutes: number } {
  const end = new Date(`${addDays(cutoff.end, 1)}T00:00:00+08:00`)
  const minutes = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000))
  return { days: Math.floor(minutes / 1440), hours: Math.floor(minutes / 60) % 24, minutes: minutes % 60 }
}
