<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Cities are rows in `communities` (status draft/pending/pilot/official/paused); only pilot/official are public. Why: new cities are added by data and approval, not code.
- Roles live only in `user_roles`, checked via `has_role` / `can_manage_community`. Why: avoids privilege escalation and keeps cities isolated.
- AI topic generation writes to `topic_drafts` only, for communities with `ai_topics_enabled`; publishing requires admin approval (`publishDraft`). Why: cost and quality control.
- Officials' results recipients come from `community_recipients`, not code. Why: per-city lists.
- Account signup is gated by an `auth.users` trigger requiring `age_13_confirmed` metadata. Why: server-side minimum-age enforcement.
- Security checks live in `tests/rls-phase2.sql` (needs a privileged DB session) and `tests/signup-age.sh`.
- Public city statuses are listed/pending/pilot/official (labels in `src/lib/cities.ts`); draft/paused stay hidden via RLS (`is_public_community`). Why: status labels must never overstate partnerships.
- City pages live at `/cities/<slug>-<state>`; public city reads go through a publishable-key client so RLS, not code, enforces isolation. Managers may only update `description`/`resources` (column grants). Tested by `tests/rls-phase2b.sh`.
- Admin server functions authenticate with the caller's Cloud access token and require `platform_admin` in `user_roles`; the passcode admin is retired. Every admin mutation writes to append-only `admin_audit_log`. Why: real accountability, no shared secret.
- Official city status requires a verification note, enforced by a DB trigger; role grants and status changes by non-platform-admins are blocked by triggers. Why: defense in depth beyond server checks.
- City managers create/close topics only in their own city via RLS + column grants on `issues`. Partner application contact details are platform-admin-only and purged after `retention_until`.
- Partnerships (Phase 5): partner_organizations, partner_pipeline, onboarding_steps, outreach_log, demo_requests, impact_records, toolkit_pages, program_settings. Public reads only verified+publicly-listed partners and reviewed+published impact; everything else is platform-admin via `src/lib/partners-admin.functions.ts` (token + checkSession, audited). A DB trigger requires a verification note and verification before public listing. Tested by `tests/rls-phase5.sh`.
