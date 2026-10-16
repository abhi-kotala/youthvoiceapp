-- Phase 2B city isolation checks. Run: psql "$SUPABASE_DB_URL" -v admin=<platform_admin uuid> -f tests/rls-phase2b.sql
-- Everything rolls back.
begin;
insert into communities (id, slug, name, state_code, status) values ('00000000-0000-0000-0000-0000000000d1','zz-test','ZZ Test','ND','draft');
insert into issues (id, title, description, community_id, source) values ('00000000-0000-0000-0000-0000000000e1','hidden','x','00000000-0000-0000-0000-0000000000d1','official');

set local role anon;
select 'anon sees draft city (expect 0)' t, count(*) from communities where slug='zz-test';
select 'anon sees draft-city topic (expect 0)' t, count(*) from issues where id='00000000-0000-0000-0000-0000000000e1';
select 'anon sees public cities (expect 4)' t, count(*) from communities;
select 'anon edits (expect UPDATE 0)';
update communities set description='anon hack' where slug='west-fargo';
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}',true);
select 'no-role user sees draft city (expect 0)' t, count(*) from communities where slug='zz-test';
select 'no-role user edits west fargo (expect UPDATE 0)';
update communities set description='B hack' where slug='west-fargo';
select set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role','authenticated')::text, true);
select 'admin sees draft city topic (expect 1)' t, count(*) from issues where id='00000000-0000-0000-0000-0000000000e1';
select 'admin edits (expect UPDATE 1)';
update communities set description='admin edit' where slug='west-fargo';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role','authenticated')::text, true);
savepoint s;
update communities set status='official' where slug='west-fargo';
rollback to s; -- (above line must fail: permission denied)
rollback;
