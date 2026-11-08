import { manilaToday } from './cutoff'
import { formatDate, formatMoney } from './format'
import { HOLIDAYS } from './holidays'
import type { HolidayType } from './holidays'
import { computeDay, ORDINARY, RATES } from './pay'

// The rule-based brain behind the pay cat. It answers in Taglish when the question has enough Tagalog in it.
// The wording mirrors pay.ts (8 regular hours, 10 PM to 6 AM night premium of 10%); the percentages and
// every example amount come from pay.ts itself, so they can't drift from what the dashboard shows.

const TAGALOG = new Set([
  'ang', 'ng', 'mga', 'sa', 'ko', 'mo', 'ba', 'po', 'pag', 'kapag', 'kung', 'paano', 'pano', 'panu', 'magkano',
  'ano', 'sahod', 'sweldo', 'suweldo', 'bayad', 'araw', 'gabi', 'oras', 'yung', 'naman', 'lang', 'ako', 'ikaw',
  'siya', 'tayo', 'kami', 'kayo', 'sila', 'hindi', 'di', 'wala', 'walang', 'meron', 'pasok', 'pumasok', 'kwenta',
  'kuwenta', 'kinukwenta', 'kinukuwenta', 'ilan', 'bakit', 'kailan', 'dagdag', 'sobra', 'lampas', 'lagpas',
  'kumusta', 'kamusta', 'musta', 'salamat', 'pwede', 'puwede', 'nga', 'na', 'eh', 'diba', 'nang', 'para', 'dapat',
  'kasi', 'pero', 'yun', 'ito', 'iyan', 'yan', 'sana', 'talaga', 'magkanu', 'sahuran', 'kita', 'anong', 'paanong',
  'ilang', 'kelan', 'mayroon', 'noong', 'nung', 'tuwing', 'kahit', 'binabayaran', 'bayaran', 'trabaho',
])
const ENGLISH = new Set([
  'how', 'what', 'is', 'are', 'the', 'my', 'i', 'do', 'does', 'much', 'when', 'if', 'you', 'it', 'of', 'for',
  'can', 'will', 'why', 'get', 'paid', 'work', 'on', 'in', 'to', 'a', 'an',
])

const LABELS: Record<HolidayType, string> = {
  regular: 'regular holiday',
  special: 'special non-working holiday',
  special_working: 'special working day',
  double: 'double holiday',
}

// First match wins, so the more specific names come before the ones they contain ("pasko" is in "bisperas ng pasko").
const HOLIDAY_NAMES: [RegExp, string][] = [
  [/christmas eve|bisperas ng pasko|noche ?buena/, 'Christmas Eve'],
  [/christmas|pasko/, 'Christmas Day'],
  [/chinese new year/, 'Chinese New Year'],
  [/new year s eve|last day of the year|bisperas ng bagong taon/, 'Last Day of the Year'],
  [/new year|bagong taon/, "New Year's Day"],
  [/all souls|araw ng mga patay|kaluluwa/, "All Souls' Day"],
  [/all saints|undas|todos los santos/, "All Saints' Day"],
  [/maundy|huwebes santo/, 'Maundy Thursday'],
  [/good friday|biyernes santo/, 'Good Friday'],
  [/black saturday|sabado de gloria/, 'Black Saturday'],
  [/independence|kalayaan/, 'Independence Day'],
  [/labou?r day|araw ng paggawa/, 'Labor Day'],
  [/heroes|mga bayani/, 'National Heroes Day'],
  [/rizal/, 'Rizal Day'],
  [/bonifacio/, 'Bonifacio Day'],
  [/ninoy/, 'Ninoy Aquino Day'],
  [/edsa|people power/, 'EDSA People Power Anniversary'],
  [/kagitingan|day of valou?r/, 'Araw ng Kagitingan'],
  [/immaculate|inmaculada/, 'Feast of the Immaculate Conception'],
  [/fitr/, "Eid'l Fitr"],
  [/adha/, "Eid'l Adha"],
]

const pct = (thousandths: number) => `${thousandths / 10}%`

function examplePay(rate: number, type: HolidayType | null, timeIn: string, timeOut: string) {
  const holiday = type ? { name: '', type } : undefined
  return computeDay({ date: '2026-01-05', status: 'worked', timeIn, timeOut, hourlyRate: rate }, () => holiday).payCentavos
}

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim()
}

export function reply(question: string, rate: number, currency: string, today = manilaToday(new Date())): string {
  const text = normalize(question)
  const words = text.split(' ')
  const tagalog = words.filter((word) => TAGALOG.has(word)).length
  const english = words.filter((word) => ENGLISH.has(word)).length
  const tl = tagalog > 0 && tagalog * 2 >= english
  const t = (en: string, taglish: string) => (tl ? taglish : en)

  const money = (centavos: number) => formatMoney(centavos, currency)
  const perHour = money(Math.round(rate * 100))
  const night = t('Hours between 10 PM and 6 AM get 10% more.', 'May dagdag na 10% mula 10 PM hanggang 6 AM.')
  const { special, regular, double } = RATES

  const nextHoliday = (name?: string) => {
    const dates = Object.keys(HOLIDAYS).filter((date) => !name || HOLIDAYS[date].name === name)
    return dates.find((date) => date >= today) ?? dates[dates.length - 1]
  }

  const dayAnswer = (type: HolidayType | null) => {
    const rates = type ? RATES[type] : ORDINARY
    const eight = examplePay(rate, type, '08:00', '16:00')
    const overtime = examplePay(rate, type, '08:00', '17:00') - eight
    const example = t(
      `At ${perHour}/hour: 8 hours = ${money(eight)}, each overtime hour = ${money(overtime)}.`,
      `Sa ${perHour}/oras: 8 oras = ${money(eight)}, bawat oras ng OT = ${money(overtime)}.`,
    )
    if (type && rates.regular !== ORDINARY.regular) {
      return `${t(
        `On a ${LABELS[type]}, the first 8 hours pay ${pct(rates.regular)} of your hourly rate and overtime pays ${pct(rates.overtime)}.`,
        `Kapag ${LABELS[type]}, ${pct(rates.regular)} ng hourly rate mo ang bayad sa unang 8 oras at ${pct(rates.overtime)} ang overtime.`,
      )} ${night} ${example}`
    }
    const lead = type
      ? t(`A ${LABELS[type]} is paid like a regular day. `, `Ang ${LABELS[type]} ay bayad na parang regular na araw. `)
      : ''
    return `${lead}${t(
      `On a regular day, the first 8 hours pay your normal hourly rate (${pct(rates.regular)}) and overtime pays ${pct(rates.overtime)}.`,
      `Sa regular na araw, normal na hourly rate mo (${pct(rates.regular)}) ang bayad sa unang 8 oras at ${pct(rates.overtime)} ang overtime.`,
    )} ${night} ${example}`
  }

  const holidayName = HOLIDAY_NAMES.find(([pattern]) => pattern.test(text))?.[1]
  if (holidayName) {
    const date = nextHoliday(holidayName)
    const type = HOLIDAYS[date].type
    return `${t(
      `${holidayName} (${formatDate(date)}) is a ${LABELS[type]}.`,
      `Ang ${holidayName} (${formatDate(date)}) ay ${LABELS[type]}.`,
    )} ${dayAnswer(type)}`
  }

  const topics: [RegExp, () => string][] = [
    [/special working/, () => dayAnswer('special_working')],
    [/\bdouble\b|\bdoble\b|dalawang holiday/, () => dayAnswer('double')],
    [/regular (na )?holi|legal holi/, () => dayAnswer('regular')],
    [/\bspecial\b|espesyal|non working/, () => dayAnswer('special')],
    [
      /rest ?day|day ?off|pahinga|absent|\bleave\b|(hindi|di) (ako )?(pumasok|nagtrabaho|papasok)|walang pasok|didn t work|did not work|don t work|not working|unworked/,
      () => t(
        `Shiftly only pays the hours you log. A day marked Rest, or a holiday you didn't work, counts as ${money(0)}, and there is no extra rest-day premium. If your employer pays unworked holidays, that won't show here.`,
        `Ang mga oras lang na nilog mo ang binabayaran ng Shiftly. Kapag Rest ang araw, o holiday na hindi ka pumasok, ${money(0)} ito, at walang dagdag na rest-day premium. Kung binabayaran ng employer mo ang holiday kahit hindi pumasok, hindi iyon makikita rito.`,
      ),
    ],
    [
      /holi ?day|pista|piyesta/,
      () => {
        const date = nextHoliday()
        const next = date
          ? ` ${t(
            `Next up: ${HOLIDAYS[date].name} on ${formatDate(date)}, a ${LABELS[HOLIDAYS[date].type]}.`,
            `Susunod: ${HOLIDAYS[date].name} sa ${formatDate(date)}, ${LABELS[HOLIDAYS[date].type]}.`,
          )}`
          : ''
        return t(
          `Holiday rates for the first 8 hours: special non-working ${pct(special.regular)}, regular ${pct(regular.regular)}, double ${pct(double.regular)}. Special working days pay like regular days (${pct(ORDINARY.regular)}). Overtime on a holiday is 30% more than its rate, and 10 PM to 6 AM adds 10%.`,
          `Rate sa unang 8 oras kapag holiday: special non-working ${pct(special.regular)}, regular ${pct(regular.regular)}, double ${pct(double.regular)}. Ang special working day ay parang regular na araw (${pct(ORDINARY.regular)}). Ang OT sa holiday ay dagdag na 30% sa rate nito, at may 10% pa mula 10 PM hanggang 6 AM.`,
        ) + next
      },
    ],
    [
      /midnight|hating ?gabi|overnight|magdamag|tawid|cross|next day/,
      () => t(
        "If your shift crosses midnight, each minute is paid by the date it falls on. For example, on a 10 PM Dec 24 to 6 AM Dec 25 shift, the hours after midnight are paid at the Christmas Day (regular holiday) rate. Overtime still counts from your time-in.",
        'Kapag lumampas ng hatinggabi ang shift mo, binabayaran ang bawat minuto ayon sa petsang kinabibilangan nito. Halimbawa, sa shift na 10 PM ng Dec 24 hanggang 6 AM ng Dec 25, ang mga oras pagkalampas ng hatinggabi ay bayad bilang Christmas Day (regular holiday). Mula pa rin sa time-in mo binibilang ang overtime.',
      ),
    ],
    [
      /night|gabi|graveyard|\bnd\b/,
      () => {
        const hour = money(examplePay(rate, null, '22:00', '23:00'))
        return t(
          `Night differential: every minute between 10 PM and 6 AM pays 10% more than it normally would, on top of overtime and holiday rates. At ${perHour}/hour, a night hour on a regular day = ${hour}.`,
          `Night differential: bawat minuto mula 10 PM hanggang 6 AM ay may dagdag na 10% sa normal nitong rate, kasama ang overtime at holiday rate. Sa ${perHour}/oras, isang oras sa gabi sa regular na araw = ${hour}.`,
        )
      },
    ],
    [
      /overtime|\bot\b|lampas|lagpas|sobra|extra hour|more than 8|over 8|after 8/,
      () => {
        const hour = money(examplePay(rate, null, '08:00', '17:00') - examplePay(rate, null, '08:00', '16:00'))
        return t(
          `Overtime starts after your first 8 hours from time-in. It pays ${pct(ORDINARY.overtime)} on a regular day, and 30% more than the holiday rate on holidays (special ${pct(special.overtime)}, regular ${pct(regular.overtime)}, double ${pct(double.overtime)}). At ${perHour}/hour, one overtime hour on a regular day = ${hour}.`,
          `Nagsisimula ang overtime pagkalampas ng unang 8 oras mula sa time-in mo. ${pct(ORDINARY.overtime)} ito sa regular na araw, at dagdag na 30% sa holiday rate kapag holiday (special ${pct(special.overtime)}, regular ${pct(regular.overtime)}, double ${pct(double.overtime)}). Sa ${perHour}/oras, isang oras ng OT sa regular na araw = ${hour}.`,
        )
      },
    ],
    [
      /deduct|kaltas|bawas|\bsss\b|philhealth|pag ?ibig|\btax|buwis|\bnet\b/,
      () => t(
        "Shiftly shows gross pay. It doesn't subtract SSS, PhilHealth, Pag-IBIG or tax, so your payslip will be lower.",
        'Gross pay ang pinapakita ng Shiftly. Hindi pa kaltas ang SSS, PhilHealth, Pag-IBIG at tax, kaya mas mababa ang makikita mo sa payslip.',
      ),
    ],
    [
      /cut ?off|kinsenas|katapusan|payday|kailan|period|semi monthly|\btotal\b|\bgross\b/,
      () => t(
        "Pay is totaled per cut-off: the 1st to the 15th, and the 16th to the end of the month. Each day's pay adds up to the gross pay at the top of your dashboard.",
        'Kada cut-off ang total ng sahod: 1 hanggang 15, at 16 hanggang katapusan ng buwan. Pinagsasama ang bayad sa bawat araw para sa gross pay sa itaas ng dashboard mo.',
      ),
    ],
    [/regular|ordinary|ordinaryo|normal|karaniwan|weekday/, () => dayAnswer(null)],
    [/thank|salamat|\bty\b/, () => t("You're welcome! Meow.", 'Walang anuman! Meow.')],
    [
      /comput|kwenta|kuwenta|kalkula|calculat|formula|sahod|sweldo|suweldo|salary|wage|\bpay|\bpaid|bayad|\brate|\bkita\b/,
      () => t(
        `Shiftly computes your pay minute by minute:
• The first 8 hours from time-in are regular; the rest is overtime.
• The day sets the rate: regular day ${pct(ORDINARY.regular)}, special holiday ${pct(special.regular)}, regular holiday ${pct(regular.regular)}, double holiday ${pct(double.regular)}.
• Overtime is ${pct(ORDINARY.overtime)} on regular days, and 30% more than the holiday rate on holidays.
• 10 PM to 6 AM adds 10%.
Ask me about any of these!`,
        `Kada minuto kinukwenta ng Shiftly ang sahod mo:
• Regular ang unang 8 oras mula time-in; overtime na ang sobra.
• Depende sa araw ang rate: regular na araw ${pct(ORDINARY.regular)}, special holiday ${pct(special.regular)}, regular holiday ${pct(regular.regular)}, double holiday ${pct(double.regular)}.
• ${pct(ORDINARY.overtime)} ang OT sa regular na araw, at dagdag na 30% sa holiday rate kapag holiday.
• May dagdag na 10% mula 10 PM hanggang 6 AM.
Tanong ka lang tungkol sa alinman dito!`,
      ),
    ],
    [
      /\b(hi|hello|helo|hey|kumusta|kamusta|musta|meow|good (morning|afternoon|evening)|magandang)\b/,
      () => t(
        "Meow! I'm Mochi. Ask me how your pay is computed: regular days, overtime, night differential or holidays. English, Tagalog or Taglish is fine.",
        'Meow! Ako si Mochi. Tanungin mo ako kung paano kinukwenta ang sahod mo: regular na araw, overtime, night diff, o holiday. Pwede English, Tagalog, o Taglish.',
      ),
    ],
  ]

  const topic = topics.find(([pattern]) => pattern.test(text))
  return topic
    ? topic[1]()
    : t(
      'Meow? I only know how Shiftly computes pay. Try "How is a regular holiday paid?" or "How does overtime work?"',
      'Meow? Sa pagkwenta lang ng sahod ako marunong. Subukan mo: "Magkano pag regular holiday?" o "Paano ang OT?"',
    )
}
