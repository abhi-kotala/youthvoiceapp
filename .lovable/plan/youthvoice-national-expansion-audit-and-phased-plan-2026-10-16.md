# YouthVoice National Expansion: Audit and Phased Plan

This plan is for review only. Nothing changes until you approve a phase.

## 1. What exists today and must keep working

- **Public pages:** Home (category boxes), issue page with poll and debate, results/printable PDF, Submit, Explain (AI policy explainer), Map with globe, My Impact, Leaderboard, Newsletter, About, Start at my school guide, Profile, password reset.
- **Anonymous-first participation:** voting and commenting use a random ID stored on the device. Accounts are optional (email/password only) and link devices to sync Impact Points.
- **Server-only writes:** votes, comments, topics, and points go through checks on the server. AI moderation blocks content and fails closed. Rate limits apply to topic submissions.
- **Automation:** AI creates new topics only when old ones close. Topics stay open 45 days, plus extra time when there are fewer than 10 votes. When a topic closes, its results are emailed to the four officials, with a copy to you.
- **Other:** admin passcode sessions, push notifications, installable app, public read-only agent access (MCP), Agora assistant, search setup, sitemap.
- **Hardcoded cities:** "Fargo", "West Fargo", "Moorhead", and "Statewide" are typed directly into about 17 files: submit checks, admin, topic generation, the globe and map, the results email, the AI prompts, and site copy. The `issues.city` column is plain text, and the official email list is fixed in code.

## 2. Database design (adds to what exists, removes nothing)

New tables:
- `states`: all 50 states plus DC (code, name).
- `communities`: id, slug, name, state_code, type (city/town/school_community/org), status (pending/active/paused), timezone, rough center point for the map (never user location), created_at.
- `community_settings`: categories, auto-generation on/off, how long topics stay open, the minimum vote count before results are released.
- `community_recipients`: officials who receive results (name, title, email, verified flag). This replaces the hardcoded email list.
- `partner_organizations` and `community_requests`: applications from cities, schools, or youth groups, with a review status.
- `user_roles` (role: platform_admin, community_admin, partner, official) plus `role_scopes` (user_id, community_id). Roles live only in this table, never on the profile.
- Security-checked helper functions: `has_role(user, role)` and `can_manage_community(user, community)`.

Changes to existing tables, done safely while the app stays live:
- Add a `community_id` column (nullable at first) to `issues`. Votes, comments, and points find their community through the issue.
- Create the 3 current cities as communities and fill in `community_id` from the existing `city` text. Keep the old `city` column and mark it deprecated. Require `community_id` only in a later step.
- "Statewide" becomes a community with type `state` for North Dakota (and one for Minnesota if needed).

Access rules (RLS):
- Public can read: active communities, approved issues in active communities, vote totals only (no rows that identify a person).
- Votes are no longer readable as raw rows by the public. Totals come from a summary view or function. This also closes an existing gap: anyone can read every vote row today, including its device ID.
- A community admin can manage issues and moderation only where `can_manage_community` is true.
- Officials see summary results only for their own community, and only after the minimum vote count is reached (for example 10). They never see individual votes, device IDs, or comment authors.

## 3. Pages and roles

| Page | Who |
|---|---|
| `/explore`: national map, participating communities, open questions, real totals only | Everyone |
| `/c/$state/$slug`: community home with issues, results, local info | Everyone |
| `/c/$state/$slug/issue/$id` (existing issue pages redirect here) | Everyone |
| Pick your community: choose state then city, saved on the device, no GPS | Everyone |
| `/partners/apply`: request to bring YouthVoice to your community | Everyone |
| `/manage`: dashboard for your own communities (topics, moderation, recipients) | Community admin / partner |
| `/officials`: summary results dashboard | Verified official |
| `/admin`: approve communities and partners, assign roles, view all | Platform admin |

The current passcode admin is replaced by role-based sign-in for staff only. Students stay anonymous.

## 4. Risks for minors, and what to resolve before a national launch

- **COPPA:** under-13 users need verifiable parental consent before any personal data is collected, and accounts count. Plan: block accounts for under-13s with an age prompt, and keep anonymous voting for everyone.
- **State youth privacy laws** (for example CA, UT, TX, and the age-appropriate design codes) and FERPA when schools are partners: written agreements are needed with schools.
- **Profile photos and bios of minors:** keep private by default and moderate photos. Consider turning photos off for anyone under 16.
- **Vote integrity:** a device ID does not equal one person. Results must be labeled "informal youth input, not a scientific survey". Add per-device and per-network rate limits and anomaly flags. Store no raw IP addresses.
- **Fake officials or partners:** verify by hand that a person's email is on an official government or school domain before granting a role.
- **Cross-community leaks:** every staff query is checked by RLS and community-scoped functions, and tests prove the separation.
- **Moderation at scale:** AI plus a human review queue for each community, report thresholds, and an escalation path for self-harm or threats.
- **Operations:** a terms of service and privacy policy written for teens, a data-deletion process, email sending reputation (start small per city), AI cost limits per community, and having an adult or organization as the legal operator. A lawyer should review before a public national launch.
- **Honesty:** no fake partnerships or numbers. Communities show as "Pilot" until an official partner is verified.

## 5. Phased roadmap

1. **Phase 1, the foundation (smallest useful step):** communities and states tables. Move the 3 cities into them with no visible change. Replace hardcoded city lists with data. Move the recipients list into the database. Hide raw vote rows from the public.
2. **Phase 2, multi-city public experience:** community pages, picking your community, `/explore`, old links redirect, map driven by the database.
3. **Phase 3, roles:** user_roles and role scopes, `/manage` for community admins, the platform admin approval flow, and retiring the passcode admin.
4. **Phase 4, officials and partners:** officials dashboard with the minimum vote count, partner application and onboarding, results emails sent per community.
5. **Phase 5, launch readiness:** age prompt and COPPA flow, teen-friendly policies, anti-abuse signals, moderation queues, cost limits per community.

## 6. Tests

- RLS tests: a community admin for A cannot read or edit B's issues, moderation, or recipients. An official cannot read vote rows. Anonymous users cannot read raw votes.
- Minimum vote count: an official sees nothing below the threshold and totals at or above it.
- Data move: every existing issue gets the right `community_id`, and totals before and after match.
- Server checks: submitting to a paused community is rejected, and an unknown community is rejected.
- Topic rotation and results emails work per community, using that community's recipients.
- End to end: pick a state and city, vote, and confirm the totals update on that community's page only.

## Questions to settle before Phase 1

- Who is the legal operator (you, a parent, a school, or a nonprofit)? This affects COPPA, terms, and partner agreements.
- Minimum age for anonymous voting and for accounts (suggested: 13+ for accounts)?
- Should new cities appear only after platform approval, or open right away as "pilot" pages?
- Should AI auto-generate topics for every community (credit cost grows with each city), or only where an admin turns it on?
