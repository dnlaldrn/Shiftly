import { expect, it } from 'vitest'
import { formatDate, formatHours, formatMoney } from './format'

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
