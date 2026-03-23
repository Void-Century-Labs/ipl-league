# IPL 2026 Fantasy League Points Tracker

Track your IPL 2026 fantasy league points and standings. Built with Next.js, Supabase, and the CricAPI.

## Features

- **Leaderboard** — Live owner standings ranked by total points
- **Team Pages** — Per-owner player rosters with individual match scores
- **Match Log** — Synced match results from CricAPI
- **Admin Panel** — Password-protected page to manage players (add/remove, toggle Captain/VC)
- **Auto Sync** — Cron endpoint to pull latest match data from CricAPI

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [CricAPI](https://cricapi.com) key

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CRICAPI_KEY` | CricAPI key |
| `CRON_SECRET` | Secret for authenticating cron requests |
| `ADMIN_PASSWORD` | Password for the admin panel |

3. Set up the database by running the SQL in `supabase/schema.sql` in your Supabase SQL editor.

4. Seed the database:

```bash
curl -X POST http://localhost:3000/api/seed
```

5. Start the dev server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the leaderboard, and [http://localhost:3000/admin](http://localhost:3000/admin) for player management.

## Deployment

### Railway

See [RAILWAY.md](./RAILWAY.md) for a step-by-step Railway deployment guide.

### Vercel

1. Import the repo on [Vercel](https://vercel.com)
2. Add all environment variables from `.env.local.example`
3. Deploy — Vercel auto-detects Next.js
4. Set up a cron job (e.g. via `vercel.json` or an external service) to hit `/api/cron/sync-matches`

## Match Syncing

The `/api/cron/sync-matches` endpoint pulls latest IPL match data from CricAPI. Call it on a schedule (every few hours during the season) with the `Authorization: Bearer <CRON_SECRET>` header.
