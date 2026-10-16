-- Phase 2B city isolation checks. Run with a privileged session; everything rolls back.
begin;
-- hidden draft city with a topic
insert into communities (id, slug, name, state_code, status) values ('00000000-0000-0000-0000-0000000000d1','zz-test','ZZ Test','ND','draft');
insert into issues (id, title, description, community_id, source) values ('00000000-0000-0000-0000-0000000000e1','hidden','x','00000000-0000-0000-0000-0000000000d1','official');
-- fake users: A manages West Fargo, B manages nothing
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','a@test.invalid','{"age_13_confirmed":true}'),
 ('00000000-0000-0000-0000-0000000000b1','b@test.invalid','{"age_13_confirmed":true}');
insert into user_roles (user_id, role, community_id) select '00000000-0000-0000-0000-0000000000a1','community_admin', id from communities where slug='west-fargo';

set local role anon;
select 'anon sees draft city (expect 0)', count(*) from communities where slug='zz-test';
select 'anon sees draft-city topic (expect 0)', count(*) from issues where id='00000000-0000-0000-0000-0000000000e1';
select 'anon sees listed/pilot cities (expect >=3)', count(*) from communities;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}',true);
update communities set description='A edit' where slug='west-fargo';
update communities set description='A hack' where slug='fargo';
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}',true);
update communities set description='B hack' where slug='west-fargo';
reset role;
select 'west fargo desc (expect A edit)', description from communities where slug='west-fargo';
select 'fargo untouched (expect not A hack)', description <> 'A hack' from communities where slug='fargo';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}',true);
do $$ begin
  begin update communities set status='official' where slug='west-fargo'; raise notice 'FAIL: status change allowed';
  exception when insufficient_privilege then raise notice 'PASS: manager cannot change status'; end;
end $$;
reset role;
rollback;
