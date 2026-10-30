import { expect, it } from 'vitest'
import { currencySymbol, formatDate, formatHours, formatMoney, formatTime } from './format'

it('finds the symbol for a currency', () => {
  expect(currencySymbol('PHP')).toBe('₱')
  expect(currencySymbol('USD')).toBe('$')
  expect(currencySymbol('EUR')).toBe('€')
})

it('shows times on a 12-hour clock', () => {
  expect(formatTime('14:05:00')).toBe('2:05 PM')
  expect(formatTime('00:00')).toBe('12:00 AM')
  expect(formatTime('12:30')).toBe('12:30 PM')
})

it('shows minutes as decimal hours', () => {
  expect(formatHours(480)).toBe('8.00')
  expect(formatHours(90)).toBe('1.50')
})

it('shows centavos as money', () => {
  expect(formatMoney(107500, 'PHP')).toContain('1,075.00')
})

it('shows a date with its weekday, whatever the device time zone', () => {
  expect(formatDate('2026-10-30')).toBe('Fri, Oct 30')
})
