#!/usr/bin/env bash
# Phase 2B city isolation checks over the public API (as anon and as a signed-in user).
# Needs: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_DB_URL; optional USER_TOKEN (signed-in access token).
set -u
U="$SUPABASE_URL/rest/v1"; K="$SUPABASE_PUBLISHABLE_KEY"; fail=0
check(){ if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (got $2, want $3)"; fail=1; fi; }
psql "$SUPABASE_DB_URL" -qc "insert into communities (id,slug,name,state_code,status) values ('00000000-0000-0000-0000-0000000000d1','zz-test','ZZ Test','ND','draft'); insert into issues (id,title,description,community_id,source) values ('00000000-0000-0000-0000-0000000000e1','hidden','x','00000000-0000-0000-0000-0000000000d1','official');"
A=(-s -H "apikey: $K")
check "anon cannot see draft city" "$(curl "${A[@]}" "$U/communities?slug=eq.zz-test&select=id" )" "[]"
check "anon cannot see draft-city topic" "$(curl "${A[@]}" "$U/issues?id=eq.00000000-0000-0000-0000-0000000000e1&select=id")" "[]"
check "anon sees 4 public cities" "$(curl "${A[@]}" "$U/communities?select=id" | grep -o '"id"' | wc -l | tr -d ' ')" "4"
before=$(psql "$SUPABASE_DB_URL" -Atc "select description from communities where slug='west-fargo'")
curl "${A[@]}" -X PATCH -H "Content-Type: application/json" -d '{"description":"anon hack"}' "$U/communities?slug=eq.west-fargo" >/dev/null
check "anon cannot edit city info" "$(psql "$SUPABASE_DB_URL" -Atc "select description from communities where slug='west-fargo'")" "$before"
if [ -n "${USER_TOKEN:-}" ]; then
  B=(-s -H "apikey: $K" -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json")
  code=$(curl "${B[@]}" -o /dev/null -w '%{http_code}' -X PATCH -d '{"status":"official"}' "$U/communities?slug=eq.west-fargo")
  check "signed-in user cannot change city status" "$code" "403"
  check "status still pilot" "$(psql "$SUPABASE_DB_URL" -Atc "select status from communities where slug='west-fargo'")" "pilot"
  curl "${B[@]}" -X PATCH -d '{"description":"user edit test"}' "$U/communities?slug=eq.fargo" >/dev/null
  is_mgr=$(psql "$SUPABASE_DB_URL" -Atc "select count(*) from communities where slug='fargo' and description='user edit test'")
  echo "INFO description edit applied=$is_mgr (expected 1 only for platform/Fargo admins, 0 otherwise)"
  psql "$SUPABASE_DB_URL" -qc "update communities set description=\$\$Fargo is North Dakota's largest city. Youth Voice topics here are student-run discussions; the City of Fargo is not a Youth Voice partner.\$\$ where slug='fargo'"
fi
echo "NOTE: delete the zz-test city/topic with a privileged session if this role cannot."
exit $fail
