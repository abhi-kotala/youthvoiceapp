# Phase 4 — National Civic Insights

Note: the uploaded brief ends at "9. Export and reporting" with no content. Exports are left out of this phase until that section is provided.

## What gets built

1. **/insights page** (added to the main menu)
   - National overview cards, each with a one-line definition:
     - Official Partner communities (verified only) — shown separately from Pilot communities
     - Active polls, completed polls
     - Total recorded responses (labeled "responses, not people"; no unique-participant count, since one person can use several devices)
     - States with participating communities (Official or Pilot only — applications and "Not Yet Participating" cities don't count)
     - Issue categories represented
   - **State explorer:** pick a state to see its communities with status badges, active questions, published results, categories, and response totals.
   - **Question directory:** search and filter by state, city, category, and open/closed. Each item links to its city page and the original poll.
   - **Category explorer:** counts of questions per category.
   - **Common themes:** shown only when a category appears in 2+ communities. Shows question count, number of communities, total responses, and date range. No combined national percentages and no rankings when data is sparse.
   - **Methodology:** how data is collected, voluntary/self-selected respondents, not representative of all youth, device-based counting, the small-group rule, and live vs. final results.
   - Empty states everywhere data is missing. No made-up numbers.

2. **Categories:** current free-text categories are mapped to a fixed list (Transportation & infrastructure, Education & youth services, Parks & public spaces, Housing & development, Environment & sustainability, Public safety, Community services, Other local issues). Existing records are not changed; mapping happens when results are displayed. New topics choose from the fixed list.

3. **Result charts:** agree / disagree / neutral bars with counts, percentages, sample size, a "Live" or "Final" tag, poll and city names, and text descriptions for screen readers. Polls today only use agree/disagree/neutral, so that is the only format charted.

4. **Privacy**
   - All totals calculated on the server; device IDs, accounts, comments and moderation records never leave it.
   - Results under the city's minimum (currently 10) are hidden everywhere: charts, cards, filters, theme totals.
   - Filter safety: theme and state totals only add up results that are already public, so narrowing a filter can't reveal a hidden poll's count. Hidden polls show "Not enough responses yet" with no number.
   - Only Official, Pilot and Not Yet Participating cities that are already public are included; draft and paused cities stay hidden by the existing database rules.

5. **City page "Insights" section:** the city's own published results with charts and a per-category breakdown, or an empty state explaining how polls get created and approved. City managers see the same results for their own city only, plus counts of polls still under the minimum (no numbers for them).

## Not changed
Voting logic, existing records, city statuses, emails, admin tools.

## Testing
- Numbers on /insights match direct database counts.
- A poll below 10 responses never shows a count on any view or filter.
- Draft city topics don't appear; signed-out requests can't read device IDs.
- Phone-sized screen check; existing pages still load.

## Technical details
- New `src/lib/insights.functions.ts`: public server functions using the publishable-key client (RLS enforced), returning only aggregated, suppressed data. Vote counts read from the `votes` columns already exposed (issue_id, choice).
- `src/lib/categories.ts`: controlled list + mapping from legacy values.
- `src/routes/insights.tsx` with head() metadata; `ResultBars` component shared with city pages.
- Threshold stays per-city `min_votes_for_results` (configurable by admin).
