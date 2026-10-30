# Hour Tracker

Tracks daily hours and shows gross pay per semi-monthly cut-off under Philippine pay rules.
The design is in `docs/superpowers/specs/2026-10-30-hour-tracking-design.md`.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in both values from the Supabase project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Run `npm run dev`.

Run tests with `npm test`.

## Deployment

The app is a static site. Set both `VITE_` variables in Vercel, then run `vercel --prod`.

In Supabase, under Authentication:

- Set the Site URL to the deployed address, so email links return to the app.
- Add custom SMTP. The built-in sender only reaches members of the Supabase team.

## Yearly holiday update

Add each new year's dates to `src/holidays.ts` once they are proclaimed, plus Eid'l Fitr, Eid'l Adha and
any holidays declared at short notice, then redeploy. Until a year is added, the app warns that its dates
are paid at the ordinary rate.

The 2027 Eid'l dates are not in the list yet.
