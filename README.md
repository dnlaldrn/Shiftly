# Shiftly

Tracks daily hours and shows gross pay per semi-monthly cut-off under Philippine pay rules.
The design is in `docs/superpowers/specs/2026-10-30-hour-tracking-design.md`.

## Running the project

You need Node.js 22.12 or newer and a Supabase project.

1. Clone the repo and install dependencies:

   ```sh
   git clone https://github.com/dnlaldrn/Shiftly.git
   cd Shiftly
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in both values from the Supabase dashboard
   (Project Settings → API):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   If a `.env.development.local` file exists, `npm run dev` uses it instead of `.env.local`. When it points at
   a local Supabase (`127.0.0.1:54321`), start that first with `npx supabase start` (needs Docker), or every
   request fails with "Failed to fetch".

3. Create the database tables by applying the migrations in `supabase/migrations`:

   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

4. Start the dev server and open http://localhost:5173:

   ```sh
   npm run dev
   ```

Other commands:

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm test`        | Run the tests                             |
| `npm run lint`    | Lint the code                             |
| `npm run build`   | Type-check and build to `dist/`           |
| `npm run preview` | Serve the production build locally        |

## Deployment

The app is a static site. Set both `VITE_` variables in Vercel, then run `vercel --prod`.

In Supabase, under Authentication:

- Set the Site URL to the deployed address, so email links return to the app.
- Add custom SMTP. The built-in sender only reaches members of the Supabase team.

## Yearly holiday update

Add each new year's dates to `src/lib/holidays.ts` once they are proclaimed, plus Eid'l Fitr, Eid'l Adha and
any holidays declared at short notice, then redeploy. Until a year is added, the app warns that its dates
are paid at the ordinary rate.

The 2027 Eid'l dates are not in the list yet.
