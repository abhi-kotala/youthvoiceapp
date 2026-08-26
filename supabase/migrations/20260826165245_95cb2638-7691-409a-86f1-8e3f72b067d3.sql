
-- Remove blanket privileges granted to public clients
REVOKE ALL ON public.issues, public.votes, public.comments, public.reports,
  public.impact_events, public.admin_sessions, public.push_subscriptions
  FROM anon, authenticated;

-- Public read surfaces (no device identifiers)
GRANT SELECT (id, title, description, category, status, created_at, city,
  impact_status, impact_note, source, topic_type, location_scope, location_name,
  review_status, closes_at) ON public.issues TO anon, authenticated;

GRANT SELECT (id, issue_id, choice, created_at) ON public.votes TO anon, authenticated;

GRANT SELECT (id, issue_id, display_name, stance, body, hidden, created_at)
  ON public.comments TO anon, authenticated;

-- Public write surfaces (device_id write-only)
GRANT INSERT (issue_id, device_id, display_name, stance, body)
  ON public.comments TO anon, authenticated;
GRANT INSERT (comment_id, device_id, reason) ON public.reports TO anon, authenticated;

-- Server-side roles keep full access
GRANT ALL ON public.issues, public.votes, public.comments, public.reports,
  public.impact_events, public.admin_sessions, public.push_subscriptions
  TO service_role;
