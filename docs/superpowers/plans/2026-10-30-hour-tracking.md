# Hour Tracking Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small website where each user tracks hours and sees gross pay per semi-monthly cut-off under PH pay rules.

**Architecture:** Static React front end talking directly to Supabase Auth and Postgres, with row-level security protecting each user's rows. All date, pay and validation logic lives in pure TypeScript modules with no React or Supabase imports.

**Tech Stack:** Node 24, Vite, React, TypeScript, Vitest, `@supabase/supabase-js`, Supabase Postgres, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-30-hour-tracking-design.md`

## Global Constraints

- All dates, cut-offs and the countdown use `Asia/Manila`, whatever the device is set to.
- Dates are `YYYY-MM-DD` strings. Times are `HH:MM` or `HH:MM:SS` strings.
- Pay is computed in integers: centavos and thousandths. No floating-point money.
- `src/pay.ts`, `src/cutoff.ts`, `src/holidays.ts` and `src/validate.ts` import no React or Supabase code.
- The browser uses only the Supabase publishable key, read from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not touch the existing `GreenQuest` or `Stanza` Supabase projects.
- Default currency is `PHP`. Allowed: PHP, USD, EUR, GBP, AUD, CAD, SGD, AED, SAR.

## Review Focus

- A device outside the Philippines near midnight must still show the Manila date and cut-off.
- Times read back from Postgres arrive as `HH:MM:SS` and must calculate the same as `HH:MM`.
- Editing a day after a raise must keep that day's original hourly rate.
- Re-saving a day must not report an overlap with itself, and overlaps must be checked across a cut-off boundary.
- A rate too large for `numeric(12,2)` must get a clear message, not a raw database error.

---

### Task 1: Project setup and cut-off dates

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/cutoff.ts`
- Test: `src/cutoff.test.ts`

**Interfaces:**
- Produces:
  - `type Cutoff = { start: string; end: string }`
  - `addDays(date: string, days: number): string`
  - `manilaToday(now: Date): string`
  - `cutoffFor(date: string): Cutoff`
  - `shiftCutoff(cutoff: Cutoff, direction: -1 | 1): Cutoff`
  - `cutoffDays(cutoff: Cutoff): string[]`
  - `countdown(cutoff: Cutoff, now: Date): { days: number; hours: number; minutes: number }`

- [ ] **Step 1: Scaffold the Vite React TypeScript app in `C:\Newapp`, add Vitest and `@supabase/supabase-js`, and add a `test` script**

`.gitignore` must include `node_modules`, `dist` and `.env.local`. `.env.example` lists the two `VITE_` variables with empty values.

- [ ] **Step 2: Write the failing tests in `src/cutoff.test.ts`**

```ts
expect(cutoffFor('2026-10-15')).toEqual({ start: '2026-10-01', end: '2026-10-15' })
expect(cutoffFor('2026-10-16')).toEqual({ start: '2026-10-16', end: '2026-10-31' })
expect(cutoffFor('2026-11-30')).toEqual({ start: '2026-11-16', end: '2026-11-30' })
expect(cutoffFor('2026-02-20').end).toBe('2026-02-28')
expect(cutoffFor('2028-02-20').end).toBe('2028-02-29')
expect(shiftCutoff({ start: '2026-10-01', end: '2026-10-15' }, -1)).toEqual({ start: '2026-09-16', end: '2026-09-30' })
expect(shiftCutoff({ start: '2026-12-16', end: '2026-12-31' }, 1)).toEqual({ start: '2027-01-01', end: '2027-01-15' })
expect(cutoffDays({ start: '2026-02-16', end: '2026-02-28' })).toHaveLength(13)
expect(manilaToday(new Date('2026-10-30T16:30:00Z'))).toBe('2026-10-31') // 12:30 AM Oct 31 in Manila
expect(countdown({ start: '2026-10-16', end: '2026-10-31' }, new Date('2026-10-30T04:00:00Z')))
  .toEqual({ days: 1, hours: 4, minutes: 0 }) // 12:00 PM Oct 30 to midnight after Oct 31
expect(countdown({ start: '2026-10-16', end: '2026-10-31' }, new Date('2026-11-01T00:00:00Z')))
  .toEqual({ days: 0, hours: 0, minutes: 0 }) // never negative
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- src/cutoff.test.ts`
Expected: FAIL, `cutoff.ts` has no exports.

- [ ] **Step 4: Implement `src/cutoff.ts`**

Use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })` for `manilaToday`. Do date arithmetic through `Date.UTC`. The cut-off ends at `${addDays(end, 1)}T00:00:00+08:00`.

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/cutoff.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold app and add cut-off dates"
```

### Task 2: Holiday data

**Files:**
- Create: `src/holidays.ts`
- Test: `src/holidays.test.ts`

**Interfaces:**
- Produces:
  - `type HolidayType = 'regular' | 'special' | 'special_working' | 'double'`
  - `type Holiday = { name: string; type: HolidayType }`
  - `holidayOn(date: string): Holiday | undefined`
  - `hasHolidayList(year: number): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
expect(holidayOn('2026-03-20')).toEqual({ name: "Eid'l Fitr", type: 'regular' })
expect(holidayOn('2026-05-27')?.type).toBe('regular')
expect(holidayOn('2026-08-21')?.type).toBe('special')
expect(holidayOn('2026-02-25')?.type).toBe('special_working')
expect(holidayOn('2027-03-27')?.type).toBe('special')
expect(holidayOn('2026-10-30')).toBeUndefined()
expect(hasHolidayList(2026)).toBe(true)
expect(hasHolidayList(2027)).toBe(true)
expect(hasHolidayList(2028)).toBe(false)
```

Also assert counts by year and type: 2026 has 12 regular, 8 special and 1 special_working; 2027 has 10, 8 and 1.

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/holidays.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/holidays.ts`**

Export `HOLIDAYS: Record<string, Holiday>`, keyed by date, with every date and type from the spec's Holidays section. Give each its name from the proclamations. `hasHolidayList` checks whether any key starts with that year.

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/holidays.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/holidays.ts src/holidays.test.ts
git commit -m "feat: add 2026 and 2027 PH holidays"
```

### Task 3: Pay calculation

**Files:**
- Create: `src/pay.ts`
- Test: `src/pay.test.ts`

**Interfaces:**
- Consumes: `addDays` from `cutoff.ts`; `holidayOn`, `hasHolidayList`, `Holiday` from `holidays.ts`
- Produces:
  - `type DayEntry = { date: string; status: 'rest' | 'worked'; timeIn: string | null; timeOut: string | null; hourlyRate: number }`
  - `type DayPay = { regularMinutes: number; overtimeMinutes: number; nightMinutes: number; payCentavos: number; missingHolidayYears: number[] }`
  - `computeDay(entry: DayEntry, lookup?: (date: string) => Holiday | undefined): DayPay` (`lookup` defaults to `holidayOn`)
  - `sumDays(days: DayPay[]): Omit<DayPay, 'missingHolidayYears'>`
  - `shiftEnd(entry: DayEntry): { date: string; minute: number } | null` (null unless worked; `minute` is minutes after midnight on `date`)

- [ ] **Step 1: Write the failing tests**

Use a `worked(date, timeIn, timeOut, hourlyRate = 100)` test helper. Each row is one test, asserting `payCentavos`.

| Test | Date | In | Out | Rate | Pay (centavos) |
|---|---|---|---|---|---|
| Spec worked example | 2026-10-30 | 14:00 | 00:00 | 100 | 107500 |
| Ordinary, overtime | 2026-10-29 | 09:00 | 19:00 | 100 | 105000 |
| Special working, overtime | 2026-02-25 | 09:00 | 19:00 | 100 | 105000 |
| Special non-working, overtime | 2026-08-21 | 09:00 | 19:00 | 100 | 137800 |
| Regular, overtime | 2026-12-25 | 09:00 | 19:00 | 100 | 212000 |
| Night starts at 10:00 PM | 2026-10-29 | 21:00 | 23:00 | 100 | 21000 |
| Night ends at 6:00 AM | 2026-10-29 | 05:00 | 07:00 | 100 | 21000 |
| Into a holiday at midnight | 2026-11-29 | 22:00 | 06:00 | 100 | 154000 |
| Out of a holiday at midnight | 2026-11-30 | 22:00 | 02:00 | 100 | 66000 |
| Dec 31 into Jan 1 | 2026-12-31 | 23:00 | 01:00 | 100 | 36300 |
| Half-up, fails with floats | 2026-10-29 | 23:00 | 00:00 | 1.15 | 127 |
| `HH:MM:SS` from Postgres | 2026-10-30 | 14:00:00 | 00:00:00 | 100 | 107500 |

Also add:

```ts
// Spec worked example minutes
expect(computeDay(worked('2026-10-30', '14:00', '00:00'))).toMatchObject({ regularMinutes: 480, overtimeMinutes: 120, nightMinutes: 120 })
// Double holiday, through the injected lookup
expect(computeDay(worked('2026-10-29', '09:00', '19:00'), () => ({ name: 'x', type: 'double' })).payCentavos).toBe(318000)
// Rest pays nothing on a holiday
expect(computeDay({ date: '2026-12-25', status: 'rest', timeIn: null, timeOut: null, hourlyRate: 100 }).payCentavos).toBe(0)
// Missing holiday list, including through a year boundary
expect(computeDay(worked('2028-01-05', '09:00', '17:00')).missingHolidayYears).toEqual([2028])
expect(computeDay(worked('2027-12-31', '23:00', '01:00')).missingHolidayYears).toEqual([2028])
expect(sumDays([a, b])) // adds each field, using two DayPay fixtures
expect(shiftEnd(worked('2026-10-30', '22:00', '06:00'))).toEqual({ date: '2026-10-31', minute: 360 })
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/pay.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/pay.ts`**

Walk the shift one minute at a time. Pay rates in thousandths:

| Date type | Regular | Overtime |
|---|---|---|
| None, or `special_working` | 1000 | 1250 |
| `special` | 1300 | 1690 |
| `regular` | 2000 | 2600 |
| `double` | 3000 | 3900 |

A minute is night when its time of day is `>= 1320` or `< 360`. Its rate is then multiplied by 11 and divided by 10, which stays an integer for every rate above. Sum `rateCentavos × thousandths` over the shift, where `rateCentavos = Math.round(hourlyRate * 100)`, then `payCentavos = Math.floor((sum + 30000) / 60000)`.

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/pay.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pay.ts src/pay.test.ts
git commit -m "feat: add pay calculation"
```

### Task 4: Validation

**Files:**
- Create: `src/validate.ts`
- Test: `src/validate.test.ts`

**Interfaces:**
- Consumes: `DayEntry`, `shiftEnd` from `pay.ts`; `addDays` from `cutoff.ts`
- Produces:
  - `validateRate(value: string): string | null`
  - `validateShift(date: string, timeIn: string, timeOut: string, previous?: DayEntry, next?: DayEntry): string | null`

Both return an error message, or null when valid.

- [ ] **Step 1: Write the failing tests**

```ts
expect(validateRate('0')).not.toBeNull()
expect(validateRate('-1')).not.toBeNull()
expect(validateRate('abc')).not.toBeNull()
expect(validateRate('10000000000')).not.toBeNull()
expect(validateRate('9999999999.99')).toBeNull()
expect(validateRate('100.50')).toBeNull()
expect(validateRate('100.505')).not.toBeNull() // more than 2 decimals

expect(validateShift('2026-10-30', '09:00', '09:00')).not.toBeNull()
expect(validateShift('2026-10-30', '', '17:00')).not.toBeNull()
expect(validateShift('2026-10-30', '09:00', '17:00')).toBeNull()
const overnight = { date: '2026-10-29', status: 'worked', timeIn: '22:00:00', timeOut: '06:00:00', hourlyRate: 100 } as const
const earlyNext = { date: '2026-10-31', status: 'worked', timeIn: '05:00:00', timeOut: '13:00:00', hourlyRate: 100 } as const
expect(validateShift('2026-10-30', '05:00', '13:00', overnight)).not.toBeNull()
expect(validateShift('2026-10-30', '06:00', '13:00', overnight)).toBeNull() // starts as the last shift ends
expect(validateShift('2026-10-30', '22:00', '06:00', undefined, earlyNext)).not.toBeNull()
expect(validateShift('2026-10-30', '22:00', '05:00', undefined, earlyNext)).toBeNull()
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- src/validate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/validate.ts`**

Only an overnight shift can reach the next day, so compare `previous`'s end minute with this `timeIn`, and this shift's end minute with `next`'s `timeIn`. Ignore neighbors with status `rest`. Accept at most 2 decimal places.

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts src/validate.test.ts
git commit -m "feat: add input validation"
```

### Task 5: Database

**Files:**
- Create: `supabase/migrations/20261030000000_init.sql`, `src/supabase.ts`, `.env.local` (not committed)

**Interfaces:**
- Produces: `supabase` client export; tables `profiles` and `day_entries`

- [ ] **Step 1: Write the migration**

```sql
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  hourly_rate numeric(12,2) not null check (hourly_rate > 0),
  currency text not null default 'PHP'
    check (currency in ('PHP','USD','EUR','GBP','AUD','CAD','SGD','AED','SAR'))
);

create table public.day_entries (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  status text not null check (status in ('rest','worked')),
  time_in time,
  time_out time,
  hourly_rate numeric(12,2) not null check (hourly_rate > 0),
  primary key (user_id, date),
  check (
    (status = 'rest' and time_in is null and time_out is null) or
    (status = 'worked' and time_in is not null and time_out is not null and time_in <> time_out)
  )
);

alter table public.profiles enable row level security;
alter table public.day_entries enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own entries" on public.day_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```

- [ ] **Step 2: Create a new Supabase project named `hour-tracker` in `ap-southeast-1` and apply the migration with `apply_migration`**

Expected: `list_tables` shows both tables with `rls_enabled: true`. Then run `get_advisors` for security and fix any finding on these tables.

- [ ] **Step 3: Implement `src/supabase.ts` and write the project URL and publishable key to `.env.local`**

`createClient` reads the two `VITE_` variables and throws a clear error if either is missing.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase src/supabase.ts
git commit -m "feat: add database schema and client"
```

### Task 6: Accounts, setup and settings

**Files:**
- Create: `src/AuthScreen.tsx`, `src/ProfileForm.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase`; `validateRate`
- Produces:
  - `type Profile = { hourly_rate: number; currency: string }`
  - `<ProfileForm userId={string} profile={Profile | null} onSaved={(p: Profile) => void} />`, used for both first-time setup and Settings
  - `formatMoney(centavos: number, currency: string): string` in `src/format.ts`, using `Intl.NumberFormat`

- [ ] **Step 1: Build `AuthScreen`**

Four modes: sign in, sign up, forgot password (`resetPasswordForEmail` with `redirectTo: window.location.origin`), and set new password (`updateUser`). Show every Supabase error as a message.

- [ ] **Step 2: Build `App`'s flow**

Subscribe to `onAuthStateChange`. `PASSWORD_RECOVERY` shows the set-new-password mode, no session shows `AuthScreen`, a session with no profile row shows `ProfileForm`, and otherwise the main screen placeholder shows. An expired session returns to `AuthScreen`.

- [ ] **Step 3: Build `ProfileForm`**

Rate field and currency dropdown, with PHP preselected. Run `validateRate` before saving, and keep typed values on a failed save.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Expected: Sign-up, sign-in, setup, sign-out and an invalid rate all behave as the spec says. Confirmation and reset emails are tested in Task 8, once SMTP is set up.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add accounts and profile setup"
```

### Task 7: Main screen

**Files:**
- Create: `src/MainScreen.tsx`, `src/DayRow.tsx`, `src/entries.ts`, `src/format.ts`
- Modify: `src/App.tsx`
- Test: `src/format.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6
- Produces:
  - `loadEntries(start: string, end: string): Promise<DayEntry[]>`
  - `saveEntry(userId: string, date: string, existing: boolean, values: { status: 'rest' | 'worked'; timeIn: string | null; timeOut: string | null }, rate: number): Promise<void>`
  - `clearEntry(userId: string, date: string): Promise<void>`
  - `formatHours(minutes: number): string`

- [ ] **Step 1: Write the failing test in `src/format.test.ts`**

```ts
expect(formatHours(480)).toBe('8.00')
expect(formatHours(90)).toBe('1.50')
expect(formatMoney(107500, 'PHP')).toContain('1,075.00')
```

- [ ] **Step 2: Run the test**

Run: `npm test -- src/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `formatHours`**

- [ ] **Step 4: Run the test**

Run: `npm test -- src/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `src/entries.ts`**

`saveEntry` inserts with `hourly_rate: rate` when the day has no row, and otherwise updates without touching `hourly_rate`, so edits keep the original rate. Throw on Supabase errors.

- [ ] **Step 6: Build `DayRow`**

Date, holiday label, Rest/Worked choice, time in and out inputs, Save and Clear buttons, and that day's pay. Disable Save while saving. Run `validateShift` before saving. On a failed save, keep the typed values and show the error.

- [ ] **Step 7: Build `MainScreen`**

Load entries from `addDays(start, -1)` to `addDays(end, 1)`, so overlap checks reach across cut-off boundaries, but count only the viewed cut-off in totals. Show the countdown for today's cut-off, refreshed every 30 seconds, plus summary totals, previous and next arrows, a Settings link, and a warning naming any year in `missingHolidayYears`.

- [ ] **Step 8: Verify in the browser**

Run: `npm run dev`
Expected: Enter the spec's worked example and see ₱1,075.00. A rate change leaves saved days unchanged, an edited saved day keeps its rate, and a new day uses the new rate.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: add main screen"
```

### Task 8: Deploy and end-to-end checks

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

Cover local setup, the two environment variables, and how to add holidays each year.

- [ ] **Step 2: Deploy to Vercel**

Run: `vercel --prod`, with both `VITE_` variables set in the project.
Expected: The site loads at its Vercel address.

- [ ] **Step 3: Set up email (user steps)**

The user creates a Resend account and API key, then enters them under Supabase Auth SMTP settings. Set Supabase's Site URL to the Vercel address.
Expected: Confirmation and reset emails arrive and return to the app.

- [ ] **Step 4: Run the manual checks on the deployed site**

Two accounts cannot read or change each other's entries, password reset works, and a cut-off total matches a hand calculation.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add setup instructions"
```
