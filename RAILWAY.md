# Railway Deployment Guide

## 1. Create Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Choose "Deploy from GitHub repo" and select your repository
3. Railway auto-detects Next.js and configures the build

## 2. Set Environment Variables

In your Railway service settings, add these environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for writes) |
| `CRICAPI_KEY` | CricAPI key for match data |
| `CRON_SECRET` | Secret for authenticating cron requests |
| `ADMIN_PASSWORD` | Password for the admin panel |

## 3. Seed the Database

After your first deploy, seed the database by sending a POST request:

```bash
curl -X POST https://your-app.up.railway.app/api/seed
```

## 4. Set Up Cron for Match Syncing

The app syncs match scores via `/api/cron/sync-matches`. You have two options:

### Option A: Railway Cron Service

Add a cron service in Railway that hits your sync endpoint:

1. Add a new service → Cron Job
2. Set the schedule (e.g., `0 */4 * * *` for every 4 hours)
3. Command: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.up.railway.app/api/cron/sync-matches`

### Option B: External Cron (cron-job.org)

1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cron job pointing to `https://your-app.up.railway.app/api/cron/sync-matches`
3. Add header: `Authorization: Bearer <your-CRON_SECRET>`
4. Set schedule (e.g., every 4 hours during IPL season)

## 5. Verify

- Visit your Railway URL — you should see the leaderboard
- Visit `/admin` and log in with your `ADMIN_PASSWORD`
- Check that match syncing works by triggering the cron endpoint manually
