export function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

export function formatMoney(centavos: number, currency: string): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(centavos / 100)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}
