# Phase 3 — City Onboarding and Admin Dashboard

Builds on Phase 2A/2B. Existing cities, topics, votes, comments, and requests stay unchanged.

## What changes for users
- **Bring YouthVoice to Your City** page gets rebuilt as a partner application: city/organization name, state, organization type, contact name, professional email (optional phone), why join, how they will engage young people. Privacy notice, validation, a hidden spam trap, rate limit (3 per email per day, plus per-device), confirmation screen. Submitting never creates a partnership.
- **Admin dashboard** at /admin requires signing in with an account that holds the platform admin role. Checked on the server for every action — hiding links is not the security. The old passcode sign-in is retired.
- Tabs: Applications (Pending / Needs info / Approved / Rejected, search + state/type filters, detail view), Communities (Pilot, Listed, Pending, Official, Draft, Paused), Drafts, Roles, Audit log.
- Actions on an application: **Approve** (creates or links a city — starts as Draft or Pending, never Official), **Reject** (with reason), **Request more info** (note saved; you email them from your inbox — no automatic emails in this phase).
- **Official Partner** can only be set by a platform admin, with a required verification note (who confirmed, how). Recorded in the audit log.
- **City manager page** (/manage) for community admins/partners: edit only their own city's description, resource links, and topics (create/close their city's topics, mark impact). They cannot change status, roles, vote totals, or see individual votes or other cities.
- New cities start with no topics and no stats; the page shows its honest empty state.

## Schema changes (additive only)
1. `community_requests`: add `contact_name`, `contact_phone` (nullable), `org_type`, `engagement_plan`, `admin_note`, `reviewed_by`, `decision_reason`, `retention_until` (default now + 1 year). Status values extended with `needs_info`. Contact details stay platform-admin-only (no public or city-admin read).
2. `communities`: add `verification_note`, `verified_by`. Trigger blocks any change to `status = 'official'` unless done by a platform admin with a note.
3. New `admin_audit_log` (who, action, target type/id, details, time). Insert only through server code; readable by platform admins only; no update/delete.
4. `user_roles`: trigger refusing any role grant by a non-platform-admin and any self-grant of platform admin (defense in depth on top of server checks).
5. `issues`: manager policies to insert/update topics only where `can_manage_community` is true for that topic's city; column limits so they cannot touch votes, source, or review fields beyond their city. Votes keep no per-person read access.
6. Retention: a function to delete rejected applications' contact details after 1 year (run from the existing scheduled job).

## Testing before calling it done
- Application: valid submit, missing fields, bad email, spam trap, rate limit.
- Approve → draft city created with a stable ID; reject; request info; audit entries written.
- Signed-out and non-admin users get refused by every admin action (direct server calls, not just UI).
- City admin cannot grant roles, set Official, edit another city, or read vote device IDs/applications.
- Mobile check of the application page, admin dashboard, and manager page.
- Regression: city pages, Explore, topics, voting still work.

## Out of scope
Phase 4 items, automatic emails to applicants, officials' totals screen.
