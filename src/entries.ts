import type { DayEntry } from './pay'
import { supabase } from './supabase'

type EntryValues = { status: 'rest' | 'worked'; timeIn: string | null; timeOut: string | null }

export async function loadEntries(start: string, end: string): Promise<DayEntry[]> {
  const { data, error } = await supabase
    .from('day_entries')
    .select('date, status, time_in, time_out, hourly_rate')
    .gte('date', start)
    .lte('date', end)
  if (error) throw new Error(error.message)
  return data.map((row) => ({
    date: row.date,
    status: row.status,
    timeIn: row.time_in,
    timeOut: row.time_out,
    hourlyRate: Number(row.hourly_rate),
  }))
}

export async function saveEntry(
  userId: string,
  date: string,
  existing: boolean,
  values: EntryValues,
  rate: number,
): Promise<void> {
  const row = { status: values.status, time_in: values.timeIn, time_out: values.timeOut }
  // Edits leave hourly_rate alone so a raise never changes a saved day.
  const { error } = existing
    ? await supabase.from('day_entries').update(row).eq('user_id', userId).eq('date', date)
    : await supabase.from('day_entries').insert({ ...row, user_id: userId, date, hourly_rate: rate })
  if (error) throw new Error(error.message)
}

export async function clearEntry(userId: string, date: string): Promise<void> {
  const { error } = await supabase.from('day_entries').delete().eq('user_id', userId).eq('date', date)
  if (error) throw new Error(error.message)
}
