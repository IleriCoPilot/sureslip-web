# sureslip-web

Next.js (App Router) + Tailwind + Supabase browser client.

## Local dev
1) Node 20 (`nvm use 20`)
2) Copy `.env.sample` to `.env.local` and fill in:
   - NEXT_PUBLIC_SUPABASE_URL=
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=
3) Dev server: `npm run dev` → http://localhost:3000

## Pages
- `/competitions` → `api.v_competitions_public`
- `/today`        → `api.v_candidates_today_public`
- `/next-48h`     → `api.v_candidates_next_48h_public`
