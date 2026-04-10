## Summary of Efficiency Review

**1. Promise.all for `getLeaderboard()` and `getAllPlayerStats()` — CORRECT**
The home page (line 118-121 of `/src/app/page.tsx`) uses `Promise.all([getLeaderboard(), getAllPlayerStats()])`. These are **independent queries** to separate tables (`owner_standings` view and `players`), so parallel execution is correct. No sequential dependency.

**2. getAllPlayerStats() N+1 query concern — NOT A PROBLEM**
The Supabase query at line 19-23 of `/src/lib/player-stats.ts` uses a single `.select()` with a relational join:
```
owners!inner ( name ),
player_match_scores ( runs, wickets, final_points )
```
This is a **single database call with foreign key traversal**, not N+1 queries. Supabase/PostgREST handles the nested array construction server-side efficiently.

**3. MVP percentile O(n²) sort issue — REAL CONCERN (minor)**
Lines 55-58 of `/src/lib/player-stats.ts`:
```typescript
sorted.forEach((p, idx) => {
  const pct = Math.round((idx / (n - 1)) * 100);
  stats.find((s) => s.id === p.id)!.mvp_score = pct;  // O(n) find × n iterations = O(n²)
});
```
For 77 players, this is ~5,900 operations (acceptable), but **inefficient by design**. A single O(n log n) sort with direct index assignment would be cleaner. However, given the small dataset, this is negligible in practice.

**4. PlayerSearchTable filtering on keystroke — REAL CONCERN (minor)**
The component at `/src/components/PlayerSearchTable.tsx` (lines 9-16):
- Filters 77 players on every keystroke with no debounce
- Filter operation is O(n) per keystroke
- **No memoization** of filtered results

For 77 players, this is ~77 string comparisons per keystroke—negligible in performance, but **poor UX pattern**. A debounce (100-200ms) would improve perceived responsiveness.

**5. Duplicate `getAllPlayerStats()` calls — REAL CONCERN**
Both `/src/app/page.tsx` (line 120) and `/src/app/players/page.tsx` (line 7) call `getAllPlayerStats()` independently. **No shared caching exists**. Both pages:
- Have `revalidate = 60` (ISR revalidation interval)
- Fetch the same data redundantly at build/revalidation time
- No request deduplication or application-level cache

Each page route gets its own full database scan on revalidation.

## Actionable Issues

1. **Duplicate data fetching (Issue #5)** — Most impactful. Add Next.js `unstable_cache` wrapper around `getAllPlayerStats()` to share results across pages during the 60s ISR window.
2. **O(n²) percentile calculation (Issue #3)** — Minor. Refactor to single pass with index mapping.
3. **Uncontrolled keystroke filtering (Issue #4)** — Minor. Add debounce to search input.</result>
<usage><total_tokens>23112</total_tokens><tool_uses>14</tool_uses><duration_ms>25890</duration_ms></usage>
</task-notification>