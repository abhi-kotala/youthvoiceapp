# Phase 5 — National Partnerships and Growth

Builds on the existing application form, admin sign-in, roles, audit log, city pages and Insights. Nothing existing is removed. No partners, endorsements, testimonials or outcomes are invented; every list starts empty until you record real data.

## Public pages
1. **/partners** — why communities join, how it works, how results inform conversations, benefits by organization type, privacy and safety, and two buttons: "Apply" (existing form) and "Request a demo". A "Current partners" box shows only verified, publicly approved partners. Today it will say there are none yet. West Fargo is labeled Pilot.
2. **Demo request / interest form** — a short form (name, organization, work email, state, message) with the same spam trap, rate limit and moderation as the application form. It saves to your admin inbox only. No emails are sent automatically.
3. **/partners/directory** — verified partners with public approval only, filterable by state, organization type and status. Each profile has a "Request a correction" link that opens a prefilled email to you.
4. **/partners/toolkit** — the 10 toolkit guides (intro, overview, pilot checklist, first poll, question-writing, sharing results with youth, privacy, FAQ, 30-day pilot plan, results-review agenda). I write a starter draft of each; you can edit them from admin without code. A "Print" button makes printable handouts.
5. **Impact stories** — reviewed and approved stories appear on /partners and the city page. Wording rules: "informed" or "discussed", never "caused", unless the evidence says so.

## Application statuses
Shown as Submitted, Under Review, Additional Information Requested, Approved, or Rejected. Existing records map over: pending → Submitted, needs_info → Additional Information Requested. Only platform admins can change them. Approval still creates a Draft/Pending city, never Official, and never gives the applicant any role.

## Admin: /admin/partners (platform admin only)
Tabs:
- **Pipeline** — each application/partnership with type, location, submitted date, coordinator, last contact, next follow-up, notes, and the 10 onboarding steps as checkboxes. Each checked step records who checked it and when. Follow-ups that are due or overdue are highlighted at the top.
- **Pilot program** — progress toward the target (default 5, editable) within a pilot period you set. Shows counts for each stage, from prospective through results reviewed with follow-up. "Active pilot" means an approved Pilot/Official city with at least one published poll and at least one counted vote during the period. Each count shows its definition and dates.
- **Growth** — applications, approval rate, median days from application to activation, activated cities, cities with poll activity in the last 30 days, published polls and counted votes, completed onboardings, follow-up actions, and partners still active after 90 days. Small counts are city-level only, never individual.
- **Outreach log** — calls/emails/meetings you record, plus demo requests.
- **Impact review** — approve, reject or verify stories submitted by city managers.
- **Toolkit** — edit guide text.
- **Directory** — mark a partner as verified (verification note required) and "approved for public listing".
Every change is written to the existing audit log.

## City manager additions (on their own city page)
- Onboarding steps for their city (view only)
- Record an outcome: poll (optional), date, description, evidence/source link, status (proposed / in progress / completed). Only you can mark "verified" or "public".
- Link to the toolkit
Existing description and topic editing stays as is.

## Email
No automated onboarding emails. The email setup only handles results emails, and the partner sender, consent and permissions aren't configured yet. The setting stays off and is noted in the report.

## Testing
Submitting an application and a demo request works; a signed-out visitor or applicant can't approve, verify, read notes, contacts or the outreach log; unverified orgs don't appear in the directory; unapproved impact stories stay hidden; a city manager can't read another city's records; pilot counts match database queries; city pages, voting and Insights still work; phone and desktop check. Audit entries appear for admin actions.

## Technical details
- Migration (additive): new tables `partner_organizations` (community_id, name, org_type, state_code, verified, verification_note, public_listing, public_description), `partner_pipeline` (request_id/community_id, coordinator, last_contact_at, next_followup_at, notes), `onboarding_steps` (pipeline_id, step_no, done_by, done_at), `outreach_log`, `demo_requests`, `impact_records` (community_id, issue_id, occurred_on, description, evidence_url, status, public, reviewed_by), `toolkit_pages` (slug, title, body markdown), `program_settings` (pilot_target, pilot_start, pilot_end). GRANTs + RLS: public SELECT only on verified+public partners, published impact stories, toolkit pages; managers read/insert their own community's impact records and steps via `can_manage_community`; everything else platform-admin only; triggers prevent non-admins from setting verified/public/verified-status. Add `under_review` to request statuses (text column, no type change).
- Server functions in `src/lib/partners.functions.ts` (public) and `src/lib/partners-admin.functions.ts` (requireSupabaseAuth + `has_role` check, audit writes).
- Routes: `partners.index.tsx`, `partners.directory.tsx`, `partners.toolkit.tsx`, `partners.demo.tsx`, `admin_.partners.tsx` (separate page from /admin). Footer + /admin link to them.
- Tests: extend `tests/rls-phase2b.sh` style with `tests/rls-phase5.sh` for anon checks.
