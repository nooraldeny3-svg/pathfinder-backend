-- =====================================================================
-- Test data: fills all 20 answers for one test user.
-- 1. Create a user: Dashboard -> Authentication -> Users -> Add user
--    (email: test@pathfinder.com, password: Test123456!, tick "Auto Confirm")
-- 2. Run this file in the SQL Editor.
-- 3. Call the analyze-profile function (see README, step 6).
-- =====================================================================

with u as (select id from auth.users where email = 'test@pathfinder.com')
insert into public.answers (user_id, question_id, value)
select u.id, a.question_id, a.value::jsonb
from u, (values
  ( 1, '"computer_science"'),
  ( 2, '"recent_graduate"'),
  ( 3, '{"communication":3,"analytical":4,"technical":3,"creativity":4,"leadership":2}'),
  ( 4, '["university_project","online_courses"]'),
  ( 5, '3'), ( 6, '2'), ( 7, '4'), ( 8, '3'), ( 9, '5'),
  (10, '2'), (11, '3'), (12, '3'), (13, '3'), (14, '4'),
  (15, '{"most":["facts_data"],"least":["set_goals"]}'),
  (16, '{"most":["research_evidence"],"least":["decide_quickly"]}'),
  (17, '{"most":["discovered_new","made_enjoy"],"least":["clear_target"]}'),
  (18, '["learning_new","work_life_balance","remote_flexible"]'),
  (19, '"2_5"'),
  (20, '"I am curious about becoming a data scientist"')
) as a(question_id, value)
on conflict (user_id, question_id) do update set value = excluded.value, updated_at = now();

-- Check: should return 20
select count(*) as answers_saved
from public.answers
where user_id = (select id from auth.users where email = 'test@pathfinder.com');
