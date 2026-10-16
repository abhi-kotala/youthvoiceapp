-- Run: psql -v ON_ERROR_STOP=1 -f tests/rls-phase2.sql  (wrapped in a transaction, rolled back)
BEGIN;
-- fixtures
INSERT INTO communities (id, slug, name, state_code, status) VALUES
 ('11111111-1111-1111-1111-111111111111','test-a','Test A','ND','pilot'),
 ('22222222-2222-2222-2222-222222222222','test-b','Test B','ND','draft');
INSERT INTO topic_drafts (community_id, title, description) VALUES
 ('11111111-1111-1111-1111-111111111111','Draft A title here','desc a desc a desc a'),
 ('22222222-2222-2222-2222-222222222222','Draft B title here','desc b desc b desc b');
INSERT INTO community_requests (city_name, state_code, contact_email) VALUES ('Testville','ND','t@example.com');
INSERT INTO user_roles (user_id, role, community_id)
 SELECT id, 'community_admin', '11111111-1111-1111-1111-111111111111' FROM auth.users WHERE lower(email) <> 'abhi.kotala561@gmail.com' LIMIT 1;

-- anon
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM communities WHERE slug='test-b') THEN RAISE EXCEPTION 'FAIL: draft city visible publicly'; END IF;
  IF NOT EXISTS (SELECT 1 FROM communities WHERE slug='test-a') THEN RAISE EXCEPTION 'FAIL: pilot city hidden'; END IF;
  RAISE NOTICE 'PASS anon: draft/pending cities hidden, pilot visible';
END $$;
DO $$ BEGIN
  PERFORM device_id FROM votes LIMIT 1; RAISE EXCEPTION 'FAIL: anon read vote device ids';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS anon: cannot read vote device ids'; END $$;
DO $$ BEGIN
  PERFORM 1 FROM topic_drafts; RAISE EXCEPTION 'FAIL: anon read drafts';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS anon: cannot read drafts'; END $$;
DO $$ BEGIN
  PERFORM 1 FROM community_requests; RAISE EXCEPTION 'FAIL: anon read requests';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS anon: cannot read requests'; END $$;
RESET ROLE;

-- city admin for A
SELECT set_config('request.jwt.claims', json_build_object('sub', user_id, 'role','authenticated')::text, true)
 FROM user_roles WHERE community_id='11111111-1111-1111-1111-111111111111' LIMIT 1;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM topic_drafts WHERE community_id='22222222-2222-2222-2222-222222222222') > 0 THEN RAISE EXCEPTION 'FAIL: city admin A saw city B drafts'; END IF;
  IF (SELECT count(*) FROM topic_drafts WHERE community_id='11111111-1111-1111-1111-111111111111') <> 1 THEN RAISE EXCEPTION 'FAIL: city admin A cannot see own drafts'; END IF;
  IF (SELECT count(*) FROM community_requests) > 0 THEN RAISE EXCEPTION 'FAIL: city admin saw requests'; END IF;
  IF (SELECT count(*) FROM ai_usage_log) > 0 THEN RAISE EXCEPTION 'FAIL: city admin saw AI usage'; END IF;
  IF (SELECT count(*) FROM user_roles WHERE user_id <> auth.uid()) > 0 THEN RAISE EXCEPTION 'FAIL: saw other roles'; END IF;
  RAISE NOTICE 'PASS city admin: isolated to own city';
END $$;
DO $$ BEGIN
  INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'platform_admin'); RAISE EXCEPTION 'FAIL: self-granted admin';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: cannot grant self a role'; END $$;
RESET ROLE;

-- signup age gate
DO $$ BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'under13@example.com', '{}'::jsonb);
  RAISE EXCEPTION 'FAIL: signup without 13+ confirmation';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS: signup refused without 13+ confirmation';
END $$;
ROLLBACK;
