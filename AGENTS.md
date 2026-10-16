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
