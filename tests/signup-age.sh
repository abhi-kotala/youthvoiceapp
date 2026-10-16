#!/usr/bin/env bash
# Signup without the 13+ confirmation must be refused.
source .env 2>/dev/null
R=$(curl -s -X POST "$VITE_SUPABASE_URL/auth/v1/signup" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"email":"age-test-'$RANDOM'@example.com","password":"Testpass123!","data":{"handle":"x"}}')
echo "$R" | grep -qi "error\|13 or older" && echo "PASS: signup refused without 13+ confirmation" || echo "FAIL: $R"
