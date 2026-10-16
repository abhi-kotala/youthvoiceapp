#!/usr/bin/env bash
# Phase 5: signed-out visitors must not read private partnership data or publish anything.
set -u
URL="${VITE_SUPABASE_URL:?}"; KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:?}"
fail=0
get() { curl -s "$URL/rest/v1/$1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"; }
for t in community_interest_requests partner_pipeline onboarding_steps outreach_log demo_requests program_settings; do
  r=$(get "$t?select=*&limit=1")
  if [[ "$r" == "[]" || "$r" == *"permission denied"* ]]; then echo "PASS anon blocked: $t"; else echo "FAIL anon read $t: $r"; fail=1; fi
done
r=$(get "partner_organizations?select=id&or=(verified.eq.false,public_listing.eq.false)")
[[ "$r" == "[]" ]] && echo "PASS unverified/unlisted partners hidden" || { echo "FAIL: $r"; fail=1; }
r=$(get "impact_records?select=id&public=eq.false")
[[ "$r" == "[]" ]] && echo "PASS unpublished impact hidden" || { echo "FAIL: $r"; fail=1; }
r=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/impact_records" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"community_id":"00000000-0000-0000-0000-000000000000","occurred_on":"2026-01-01","description":"xxxxxxxxxxxxxxxxxxxxxxxxx","public":true}')
[[ "$r" == "401" || "$r" == "403" ]] && echo "PASS anon can't add impact" || { echo "FAIL anon insert impact: $r"; fail=1; }
r=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/partner_organizations" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"name":"Fake","verified":true,"verification_note":"x","public_listing":true}')
[[ "$r" == "401" || "$r" == "403" ]] && echo "PASS anon can't add partners" || { echo "FAIL anon insert partner: $r"; fail=1; }
r=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$URL/rest/v1/toolkit_pages?slug=eq.faq" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"body":"hacked"}')
b=$(get "toolkit_pages?select=body&slug=eq.faq")
[[ "$b" != *hacked* ]] && echo "PASS anon can't edit toolkit (HTTP $r, no rows changed)" || { echo "FAIL anon edited toolkit"; fail=1; }
exit $fail
