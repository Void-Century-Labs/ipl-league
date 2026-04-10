## App Information

**Name:** IPL League Points Tracker (2026 Season)
**Type:** Fantasy Cricket League Dashboard
**Stack:** Next.js 16 + TypeScript, Tailwind CSS 4, Supabase (PostgreSQL), CricAPI
**Status:** MVP — live and functional for IPL 2026

**League Setup:** 7 owners, 77 drafted players (11 per owner), 10 IPL teams

---

## Current Feature List

### Core Features
- **Leaderboard** — Owners ranked by total fantasy points ("The Reckoning Table")
- **Team Pages** — Per-owner roster with expandable match-by-match breakdowns
- **Players Directory** — Searchable/filterable table of all 77 players with stats (runs, wickets, points, MVP score)
- **Match Log** — Last 30 matches with scorers and fantasy points earned
- **Highlights Dashboard** — Best Batsman, Best Bowler, Best All-rounder, Best MVP value cards

### Scoring System
| Category | Points |
|---|---|
| Runs | 1 per run |
| Wickets | 25 per wicket |
| Century bonus | +100 |
| 5-wicket haul bonus | +100 |
| Hat-trick bonus | +200 |
| 6 sixes bonus | +300 |
| Captain multiplier | 2x |
| Vice-Captain multiplier | 1.5x |

### Admin Panel (password-protected)
- Add/remove players with auto CricAPI ID lookup
- Set Captain (C) and Vice-Captain (VC) per owner (enforces 1 each)
- View all players grouped by owner

### Automated Sync
- Cron endpoint pulls completed matches from CricAPI
- Extracts batting/bowling stats per player from scorecards
- Calculates and stores fantasy points automatically
- Bearer token auth for security

### UI/UX
- Dark/Light theme toggle (localStorage-persisted)
- Responsive design (mobile-friendly)
- Rank-based styling (gold/silver/bronze)
- 60-second ISR revalidation for near-live data

---

## MVP Limitations (opportunities for the wider app)

1. **Hardcoded league** — Single league, fixed 7 owners, no user registration
2. **No catches scoring** — Tracked in DB but worth 0 points
3. **Hat-trick/6-sixes detection disabled** — Requires ball-by-ball data unavailable from CricAPI
4. **No live match updates** — Only syncs completed matches
5. **Single season** — Tied to IPL 2026, no multi-season support
6. **No auction/draft system** — Players pre-seeded via API
7. **No notifications** — No alerts for match results or leaderboard changes
8. **No trade/transfer system** — Rosters are static after draft
9. **No head-to-head comparisons** — Between owners or players
10. **MVP metric is basic** — Points/purse percentile, not a robust formula
