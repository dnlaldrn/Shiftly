export function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

export function formatMoney(centavos: number, currency: string): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(centavos / 100)
}

export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat('en-PH', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
  return parts.find((part) => part.type === 'currency')?.value ?? currency
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = Number(hours)
  return `${hour % 12 || 12}:${minutes} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`))
}
