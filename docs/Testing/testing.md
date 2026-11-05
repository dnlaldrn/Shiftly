1. Start a local database (one time)

supabase start    # uses the checked-in supabase/config.toml, runs Postgres and login locally in Docker, and applies both migrations

supabase start prints an API URL (http://127.0.0.1:54321) and a publishable key. Put them in a new file, .env.development.local:

VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<key printed by supabase start>

When you run npm run dev, Vite uses this file instead of .env.local, so the live settings stay untouched. Your .gitignore already excludes *.local, so this file won't be committed.

To confirm the app is local before testing, look in DevTools → Network: every request should go to 127.0.0.1:54321 and none to wbkimprolgchclwbykfr.supabase.co.

2. Automated checks

npx tsc -b && npm run lint && npm test && npm run build

3. Manual checks with npm run dev

┌──────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
│                                Check                                 │                                 Expected                                 │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Open the site signed out                                             │ Home page appears, with the Halloween background                         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Fresh database                                                       │ Stats show 0+ Active Users and 0+ Salary Logs                            │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Create 2 accounts and log a few days                                 │ Counts go up after a page reload                                         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Run supabase stop, then reload                                       │ Stats row disappears and the rest of the page still works                │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Get started                                                          │ Opens "Create account"                                                   │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Sign in (top right)                                                  │ Opens "Sign in"                                                          │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Password reset link (emails go to Mailpit at http://127.0.0.1:54324) │ Opens "Set a new password", not the Home page                            │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Sign out                                                             │ ⚠️ I expect this goes to the sign-in form, not the Home page (see below) │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ Light/dark mode, 390px and 320px widths in DevTools device mode      │ No sideways scrolling, and the footer is visible                         │
└──────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

Likely issue to check: the app remembers which form you opened, sign-in or sign-up, and never resets it. So after signing out, you probably land on the sign-in form instead of the Home page. If you'd rather return to Home, it's a one-line fix: clear that choice when the user signs out.

4. Optional: a Vercel preview

The project is linked to Vercel, so pushing update-branch should create a preview link. But a preview probably uses the same live Supabase settings as production, unless you set different preview environment variables in the Vercel dashboard. So either:
- point the preview at a second, free Supabase project used only for testing, or
- use the preview only to look at the page, and don't sign up or log any days.

5. Merge

When the local checks pass, commit, open a pull request into main, and merge. Since the live database already has the function, the stats will work on production as soon as it deploys.