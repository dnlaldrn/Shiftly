import { describe, expect, it } from 'vitest'
import { reply } from './payHelp'

const ask = (question: string) => reply(question, 100, 'PHP', '2026-11-08')

describe('pay cat replies', () => {
  it.each([
    ['How is a regular holiday paid?', ['On a regular holiday', '200%', '260%', '₱1,600.00', '₱260.00']],
    ['Magkano ang OT pag special holiday?', ['Kapag special non-working holiday', '130%', '169%', '₱1,040.00', '₱169.00']],
    ['OT sa regular holiday?', ['Kapag regular holiday', '₱260.00']],
    ['how much on a regular day', ['On a regular day', '100%', '125%', '₱800.00', '₱125.00']],
    ['special working holiday?', ['paid like a regular day', '₱800.00']],
    ['double holiday', ['300%', '390%', '₱2,400.00']],
    ['paano kinukwenta ang night diff', ['Night differential', 'dagdag na 10%', '₱110.00']],
    ['how does overtime work', ['after your first 8 hours', '125%', '₱125.00']],
    ['magkano pag pasko?', ['Ang Christmas Day (Fri, Dec 25) ay regular holiday', '₱1,600.00']],
    ['Is Christmas Eve a holiday?', ['Christmas Eve (Thu, Dec 24) is a special non-working holiday', '₱1,040.00']],
    ['anong holiday?', ['Susunod: Bonifacio Day sa Mon, Nov 30, regular holiday']],
    ['shift crosses midnight', ['each minute is paid by the date it falls on']],
    ['bayad ba kahit hindi pumasok sa holiday?', ['nilog mo', '₱0.00']],
    ['may kaltas ba na SSS?', ['Hindi pa kaltas']],
    ['paano kinukwenta ang sahod ko', ['Kada minuto', '200%']],
    ['hello', ["I'm Mochi"]],
    ['kumusta', ['Ako si Mochi']],
    ['salamat!', ['Walang anuman']],
    ['asdf qwerty', ['Meow?', 'How is a regular holiday paid?']],
  ])('%s', (question, expected) => {
    const answer = ask(question)
    for (const part of expected) expect(answer).toContain(part)
  })

  it('uses the hourly rate and currency it is given', () => {
    expect(reply('regular day', 87.5, 'USD', '2026-11-08')).toContain('$700.00')
  })
})
