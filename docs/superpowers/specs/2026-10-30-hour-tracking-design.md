# Shiftly (Hour Tracking Website): Design

Date: 2026-10-30
Status: Awaiting user review

## Purpose

A small website for a user and a few people they know. Each person tracks their
own hours and sees their expected gross pay for the current semi-monthly
cut-off, using Philippine pay rules.

Success means a user can enter a cut-off's hours and get a total they can trust
and check by hand against the rules below.

## Agreed scope

- Email and password accounts, including forgot password.
- Hourly rate and currency per user, with PHP as the default.
- Countdown to the end of the current cut-off (1st–15th, or 16th to month-end).
- Each day is marked Rest or Worked (with time in and time out).
- Overtime pay, and a 10% night differential from 10:00 PM to 6:00 AM.
- PH holiday labels, with pay multiplied by holiday type.
- Cut-off salary total.

## Not included

- Deductions (SSS, PhilHealth, Pag-IBIG, tax). All figures are gross pay.
- Meal break deduction. Every minute between time in and time out is paid.
- Rest-day premium. A day with hours is paid by its date alone.
- Pay for unworked holidays. A rest day always pays nothing.
- Editable pay rates. The rates below are fixed in the code.
- Currency conversion. Currency changes the displayed symbol only.
- Admin or employer views, exports, and multiple shifts per day.

The rest-day premium and unworked-holiday exclusions are deliberate choices.
Both can make the app show less than DOLE rules would give an eligible worker.

## Architecture

- **Front end:** Vite, React and TypeScript, built as a static site on Vercel.
- **Backend:** Supabase for email/password auth and Postgres. There is no custom
  server. The front end uses only the publishable key.

| File | Responsibility |
|---|---|
| `src/lib/pay.ts` | Pure function: a day's entry, rate and holidays in; hours and pay out |
| `src/lib/cutoff.ts` | Pure functions: cut-off dates for a date, and the countdown |
| `src/lib/holidays.ts` | PH holiday data, and whether a year's list exists |
| `src/lib/supabase.ts` | Supabase client |
| `src/App.tsx`, `src/pages`, `src/components` | Screens and UI only, with no pay logic |

The app has no routes. A password reset link returns to the site, and Supabase's
`PASSWORD_RECOVERY` auth event shows the new-password form.

## Data

**`profiles`**

| Column | Type | Rules |
|---|---|---|
| `user_id` | uuid, primary key | References `auth.users` |
| `hourly_rate` | numeric(12,2) | Greater than 0 |
| `currency` | text | Default `PHP`; one of PHP, USD, EUR, GBP, AUD, CAD, SGD, AED, SAR |

**`day_entries`**

| Column | Type | Rules |
|---|---|---|
| `user_id` | uuid | References `auth.users` |
| `date` | date | Primary key with `user_id`; the date the shift started |
| `status` | text | `rest` or `worked` |
| `time_in` | time | Required if worked, null if rest |
| `time_out` | time | Required if worked, null if rest; differs from `time_in` |
| `hourly_rate` | numeric(12,2) | Greater than 0; see below |

Row-level security on both tables allows a signed-in user to read and change
only rows where `user_id = auth.uid()`. The rules in the tables above are also
enforced as database constraints.

A day with no row is blank and pays nothing. A day can be cleared, which deletes
its row.

**Rate history:** `day_entries.hourly_rate` is copied from the profile when the
row is created, and is kept when the row is edited. Changing the profile rate
therefore affects new entries only, and past totals never change. The one
exception is a rest day changed to worked, which takes the current rate because
a rest day has no pay to protect. A worked day whose rate differs from the
profile rate shows its own rate.

## Pay rules

All times are Philippine time (`Asia/Manila`), whatever the device is set to.

1. **Shift length:** If `time_out` is earlier than `time_in`, the shift ends the
   next day. Every minute between them is paid.
2. **Regular or overtime:** The first 480 minutes from time in are regular. The
   rest are overtime.
3. **Day rate:** Each minute uses the rate of the calendar date it falls on. A
   shift running past midnight into a holiday earns the holiday rate from
   12:00 AM, and a shift running out of one drops back the same way.

   | Date type | Day rate | Overtime multiplier | Overtime rate |
   |---|---|---|---|
   | Ordinary day | 100% | × 1.25 | 125% |
   | Special working day | 100% | × 1.25 | 125% |
   | Special non-working day | 130% | × 1.30 | 169% |
   | Regular holiday | 200% | × 1.30 | 260% |
   | Double holiday | 300% | × 1.30 | 390% |

4. **Night differential:** Multiply by 1.10 for any minute from 10:00 PM up to,
   but not including, 6:00 AM.
5. **Pay for a minute:** hourly rate ÷ 60 × day rate × overtime multiplier, if
   any × night multiplier, if any.
6. **Rest days:** These pay nothing, including on holidays.
7. **Rounding:** Each day's pay is rounded to the centavo (half up), then the
   days are added. Calculation uses integers (centavos and thousandths) to avoid
   floating-point errors.
8. **Cut-off total:** The sum of the days in the cut-off. A shift counts toward
   the cut-off of its start date, even if it ends in the next one.

**Worked example:** ₱100/hour, ordinary day, 2:00 PM to 12:00 AM.

| Time | Type | Calculation | Pay |
|---|---|---|---|
| 2:00–10:00 PM | Regular | 8 × ₱100 | ₱800.00 |
| 10:00 PM–12:00 AM | Overtime and night | 2 × ₱100 × 1.25 × 1.10 | ₱275.00 |
| **Total** | | | **₱1,075.00** |

## Holidays

`src/lib/holidays.ts` maps each date to a name and type (`regular`, `special`,
`special_working`, or `double`). Dates come from Proclamation No. 1006, s. 2025
and No. 1427, s. 2026, plus the separate Eid'l proclamations. No date in either
list is currently a double holiday, but the type stays for when one occurs.

**2026 regular:** Jan 1, Mar 20 (Eid'l Fitr), Apr 2, Apr 3, Apr 9, May 1,
May 27 (Eid'l Adha), Jun 12, Aug 31, Nov 30, Dec 25, Dec 30.

**2026 special non-working:** Feb 17, Apr 4, Aug 21, Nov 1, Nov 2, Dec 8, Dec 24,
Dec 31.

**2026 special working:** Feb 25.

**2027 regular:** Jan 1, Mar 25, Mar 26, Apr 9, May 1, Jun 12, Aug 30, Nov 30,
Dec 25, Dec 30.

**2027 special non-working:** Feb 6, Mar 27, Aug 21, Nov 1, Nov 2, Dec 8, Dec 24,
Dec 31.

**2027 special working:** Feb 25.

The 2027 Eid'l dates are not proclaimed yet. They, any holidays declared at
short notice, and each new year's list must be added to `src/lib/holidays.ts` by
hand and redeployed.

The Lawphil copy of Proclamation No. 1427 prints Feb 6, Mar 27, Nov 2 and Dec 24
under a "Special (Working) Day" heading, while its recitals and press coverage
call them additional special non-working days. This design treats them as
special non-working days.

## Screens

- **Sign-in:** Sign in, sign up (with a username of up to 30 characters, stored
  in the Supabase user metadata), forgot password, and set new password.
- **First-time setup:** Hourly rate and currency, with PHP preselected. Shown
  until a profile exists.
- **Main screen:**
  - A greeting using the username, or "Hi there" if the account has none.
  - Skeleton placeholders while the profile or a cut-off loads.
  - Banknotes showing the currency symbol rain behind gross pay, drawn with a
    three.js shader and loaded separately. The rain pauses off-screen, stays
    still for reduced motion, and is left out where WebGL is unavailable.
  - Countdown to the end of the cut-off in days, hours and minutes, moving to
    the next cut-off automatically when it ends.
  - Summary of regular hours, overtime hours, night hours and total pay.
  - One row per day: date, holiday label, saved hours or Rest, and that day's
    pay. Clicking a row opens a popover with a Rest/Worked dropdown, which asks
    for time in and time out when Worked is chosen.
  - Previous and next arrows for other cut-offs.
  - The countdown always tracks today's cut-off, whichever one is being viewed.
- **Settings:** Username, hourly rate, currency, and sign out.

## Errors and validation

- These are blocked with a clear message:
  - an hourly rate of zero or less
  - time in equal to time out
  - a shift overlapping the previous day's overnight shift, or running into the
    next day's saved shift
- A failed save keeps the entry on screen and shows an error, so nothing typed
  is lost.
- If a shift touches a year with no holiday list, the app shows a warning rather
  than quietly paying those dates at the ordinary rate.
- Sign-in, sign-up and reset errors from Supabase are shown as messages.

## Email setup

Supabase's built-in email is rate-limited and, by default, only delivers to
members of the Supabase team. Sign-up confirmation and password reset emails
need a custom SMTP provider (Resend's free plan is the default choice), which may
need a domain the user owns. Supabase's Site URL must be set to the deployed
address so links in those emails return to the app.

The free Supabase plan pauses projects after about a week without use. Data is
kept, and the project is restored from the dashboard.

## Testing

**Automated (Vitest), `pay.ts`:**

- The ₱100 worked example.
- Each date type at regular and overtime rates.
- Night minutes at each boundary: 10:00 PM and 6:00 AM.
- Shifts crossing midnight into and out of a holiday.
- Shifts crossing Dec 31 into Jan 1.
- Rest days paying nothing on a holiday.
- Rounding, including a case that fails with floating-point arithmetic.

**Automated (Vitest), `cutoff.ts`:**

- The 15th, 16th and last day of a month.
- February in leap and non-leap years, and 30- and 31-day months.
- The countdown across a cut-off boundary in Philippine time.

**Manual, on the deployed site:**

- Two accounts, confirming neither can read or change the other's entries.
- Sign up, password reset, entering hours, and a cut-off total checked by hand.

## Sources

- [Proclamation No. 1006, s. 2025 (2026 holidays)](https://lawphil.net/executive/proc/proc2025/proc_1006_2025.html)
- [Proclamation No. 1427, s. 2026 (2027 holidays)](https://lawphil.net/executive/proc/proc2026/proc_1427_2026.html)
- [Proclamation No. 1189, s. 2026 (Eid'l Fitr, Mar 20)](https://lawphil.net/executive/proc/proc2026/proc_1189_2026.html)
- [Proclamation No. 1264, s. 2026 (Eid'l Adha, May 27)](https://lawphil.net/executive/proc/proc2026/proc_1264_2026.html)
- [Summary of DOLE Labor Advisory No. 12-25 (2026 holiday pay)](https://www.grantthornton.com.ph/technical-alerts/outsourcing-alert/2025/dole-labor-advisory-no-12-25/)
- [DOLE Eid'l Adha pay guidelines, Labor Advisory No. 09, s. 2026](https://www.gmanetwork.com/news/money/economy/989093/dole-holiday-pay-guidelines-eidl-adha/story/)
- [Double holiday rule, Asian Transmission v. Court of Appeals](https://jur.ph/jurisprudence/digest/asian-transmission-corp-v-court-of-appeals)
