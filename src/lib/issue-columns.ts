/**
 * Columns on `issues` that are safe to read from the browser.
 * Deliberately excludes `submitted_by_device` (an anonymous device identifier).
 */
export const ISSUE_PUBLIC_COLUMNS =
  "id, title, description, category, status, created_at, city, impact_status, impact_note, source, topic_type, location_scope, location_name, review_status, closes_at";
