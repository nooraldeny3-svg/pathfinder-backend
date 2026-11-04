-- =====================================================================
-- PathFinder AI - content (questions + career fields)
-- Run this SECOND, after the schema migration.
-- Safe to run again: it clears the content tables first.
-- (It does NOT touch users, answers or results.)
-- =====================================================================

truncate public.question_options, public.careers, public.work_environments,
         public.field_skills restart identity;

-- ---------------------------------------------------------------------
-- CAREER FIELDS
-- q3_skill = the Q3 skill that belongs to this field
-- ---------------------------------------------------------------------
insert into public.career_fields (code, name, short_label, description, q3_skill, sort_order) values
('data',     'Data / Research',             'Data',     'You like finding patterns and answers in evidence.',                 'analytical',    1),
('creative', 'Creative / UX',               'Creative', 'Your answers show strong creative and design instincts.',            'creativity',    2),
('people',   'People / Operations',         'People',   'You enjoy organizing people and keeping work running smoothly.',     'communication', 3),
('tech',     'Technology / Engineering',    'Tech',     'You enjoy building things and solving technical problems.',          'technical',     4),
('business', 'Business / Entrepreneurship', 'Business', 'You are driven by goals, growth and turning ideas into results.',    'leadership',    5)
on conflict (code) do update set name = excluded.name, short_label = excluded.short_label,
  description = excluded.description, q3_skill = excluded.q3_skill, sort_order = excluded.sort_order;

insert into public.careers (field_code, title, sort_order) values
('data','Data Analyst',1), ('data','Research Assistant',2), ('data','BI Analyst',3), ('data','Market Researcher',4),
('creative','UI/UX Designer',1), ('creative','Graphic Designer',2), ('creative','Content Creator',3), ('creative','Copywriter',4),
('people','HR Coordinator',1), ('people','Project Coordinator',2), ('people','Operations Assistant',3), ('people','Customer Success Specialist',4),
('tech','Software Engineer',1), ('tech','Web Developer',2), ('tech','QA Engineer',3), ('tech','IT Support Specialist',4), ('tech','Network Administrator',5),
('business','Business Analyst',1), ('business','Marketing Specialist',2), ('business','Sales Representative',3), ('business','Startup Founder',4);

insert into public.work_environments (field_code, name, sort_order) values
('data','Research lab',1), ('data','Corporate analytics',2), ('data','Remote',3),
('creative','Design agency',1), ('creative','Product team',2), ('creative','Freelance',3),
('people','Corporate office',1), ('people','NGO / non-profit',2), ('people','Hybrid',3),
('tech','Tech company',1), ('tech','Startup',2), ('tech','Remote',3),
('business','Startup',1), ('business','Corporate office',2), ('business','Sales team',3);

-- 3 key skills per field (used for the skill gap, target 80%)
insert into public.field_skills (field_code, name, base_skill, target, sort_order) values
('data','SQL & Excel','technical',80,1),
('data','Statistics','analytical',80,2),
('data','Data visualization','analytical',80,3),
('creative','UI/UX design tools (Figma)','creativity',80,1),
('creative','Visual design principles','creativity',80,2),
('creative','Writing & storytelling','communication',80,3),
('people','Communication & presentation','communication',80,1),
('people','Project planning','leadership',80,2),
('people','Team coordination','leadership',80,3),
('tech','Programming','technical',80,1),
('tech','Problem solving & algorithms','analytical',80,2),
('tech','Systems & networking','technical',80,3),
('business','Business strategy & finance','analytical',80,1),
('business','Sales & negotiation','communication',80,2),
('business','Leadership & management','leadership',80,3);

-- ---------------------------------------------------------------------
-- SECTIONS
-- ---------------------------------------------------------------------
insert into public.sections (id, title, description, sort_order) values
(1, 'Your background',        'Your studies, skills and experience.',              1),
(2, 'Your interests',         'The kinds of work you would enjoy.',                2),
(3, 'How you really work',    'How you think, act and feel at work.',              3),
(4, 'Priorities & situation', 'What matters to you and how much time you have.',   4)
on conflict (id) do update set title = excluded.title, description = excluded.description, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
-- QUESTIONS (20)
-- ---------------------------------------------------------------------
insert into public.questions (id, section_id, code, label, title, subtitle, type, field_code, required, settings) values
-- Section 1
( 1, 1, 'study_field',    'Study field',     'What did you study?',                              null,                                   'dropdown',      null, true,  '{}'),
( 2, 1, 'stage',          'Your stage',      'Where are you in your journey?',                   null,                                   'single_choice', null, true,  '{}'),
( 3, 1, 'current_skills', 'Current skills',  'How would you rate your current skills?',          '1 = beginner, 5 = strong',             'rating_grid',   null, true,  '{"min":1,"max":5}'),
( 4, 1, 'experience',     'Experience',      'What experience do you already have?',             'Select all that apply',                'multi_select',  null, true,  '{}'),
-- Section 2 (each one belongs to a field)
( 5, 2, 'interest_writing',    'Your interests', 'Writing stories, articles, or social media posts', 'How much would you enjoy doing this?', 'scale', 'creative', true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
( 6, 2, 'interest_budget',     'Your interests', 'Planning a budget or growth strategy',             'How much would you enjoy doing this?', 'scale', 'business', true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
( 7, 2, 'interest_research',   'Your interests', 'Running experiments and doing research',           'How much would you enjoy doing this?', 'scale', 'data',     true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
( 8, 2, 'interest_organizing', 'Your interests', 'Organizing events and schedules',                  'How much would you enjoy doing this?', 'scale', 'people',   true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
( 9, 2, 'interest_data',       'Your interests', 'Analyzing data to find patterns',                  'How much would you enjoy doing this?', 'scale', 'data',     true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
(10, 2, 'interest_selling',    'Your interests', 'Pitching ideas or selling a product',              'How much would you enjoy doing this?', 'scale', 'business', true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
(11, 2, 'interest_software',   'Your interests', 'Building software or fixing technical problems',   'How much would you enjoy doing this?', 'scale', 'tech',     true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
(12, 2, 'interest_systems',    'Your interests', 'Setting up systems, networks, or devices',         'How much would you enjoy doing this?', 'scale', 'tech',     true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
(13, 2, 'interest_team',       'Your interests', 'Helping a team work well together',                'How much would you enjoy doing this?', 'scale', 'people',   true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
(14, 2, 'interest_design',     'Your interests', 'Designing how an app or website looks',            'How much would you enjoy doing this?', 'scale', 'creative', true, '{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}'),
-- Section 3 (Most / Least)
(15, 3, 'group_project', 'How you work', 'In a group project, I usually...',   'Pick what is MOST and LEAST like you (at least one of each)', 'most_least', null, true, '{}'),
(16, 3, 'new_problem',   'How you work', 'When I face a new problem, I first...', 'Pick what is MOST and LEAST like you (at least one of each)', 'most_least', null, true, '{}'),
(17, 3, 'satisfaction',  'How you work', 'I feel most satisfied when...',      'Pick what is MOST and LEAST like you (at least one of each)', 'most_least', null, true, '{}'),
-- Section 4
(18, 4, 'priorities',    'Priorities',    'Choose and rank your top 3',                        'Click in order of importance', 'ranking',       null, true,  '{"count":3}'),
(19, 4, 'learning_time', 'Learning time', 'How much time can you spend learning each week?',   null,                           'single_choice', null, true,  '{}'),
(20, 4, 'curious_about', 'Optional',      'Is there a job or field you are curious about?',    'One sentence, you can skip',   'text',          null, false, '{"max_length":300}')
on conflict (id) do update set section_id = excluded.section_id, code = excluded.code, label = excluded.label,
  title = excluded.title, subtitle = excluded.subtitle, type = excluded.type, field_code = excluded.field_code,
  required = excluded.required, settings = excluded.settings;

-- ---------------------------------------------------------------------
-- OPTIONS
-- field_code shows which career field an option points to
-- ---------------------------------------------------------------------
-- Q1 study field
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(1, 'engineering',          'Engineering',              'tech',     1),
(1, 'computer_science',     'Computer Science / IT',    'tech',     2),
(1, 'software_engineering', 'Software Engineering',     'tech',     3),
(1, 'business',             'Business & Economics',     'business', 4),
(1, 'science_math',         'Science & Math',           'data',     5),
(1, 'health',               'Health & Medicine',        'people',   6),
(1, 'humanities',           'Humanities & Languages',   'creative', 7),
(1, 'arts_design',          'Arts & Design',            'creative', 8),
(1, 'education',            'Education',                'people',   9),
(1, 'law_social',           'Law & Social Sciences',    'people',  10),
(1, 'other',                'Other',                    null,      11);

-- Q2 stage
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(2, 'still_studying',   'Still studying (final years)',          null, 1),
(2, 'recent_graduate',  'Recently graduated (under 1 year)',     null, 2),
(2, 'new_direction',    'Graduated, looking for a new direction', null, 3);

-- Q3 skills (rows of the grid)
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(3, 'communication', 'Communication',      'people',   1),
(3, 'analytical',    'Analytical thinking','data',     2),
(3, 'technical',     'Technical skills',   'tech',     3),
(3, 'creativity',    'Creativity',         'creative', 4),
(3, 'leadership',    'Leadership',         'business', 5);

-- Q4 experience
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(4, 'internship',         'Internship',                      null, 1),
(4, 'job',                'Part-time or full-time job',      null, 2),
(4, 'university_project', 'University project',              null, 3),
(4, 'volunteering',       'Volunteering',                    null, 4),
(4, 'online_courses',     'Online courses or certificates',  null, 5),
(4, 'freelance',          'Freelance or personal project',   null, 6);

-- Q15 group project
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(15, 'creative_ideas',     'Come up with creative ideas',     'creative', 1),
(15, 'everyone_heard',     'Make sure everyone is heard',     'people',   2),
(15, 'facts_data',         'Dig into facts and data',         'data',     3),
(15, 'technical_building', 'Handle the technical building',   'tech',     4),
(15, 'set_goals',          'Set goals and push for results',  'business', 5);

-- Q16 new problem
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(16, 'unusual_approach',  'Try an unusual new approach',     'creative', 1),
(16, 'technical_steps',   'Break it into technical steps',   'tech',     2),
(16, 'ask_others',        'Ask others for their view',       'people',   3),
(16, 'decide_quickly',    'Decide quickly on a plan',        'business', 4),
(16, 'research_evidence', 'Research and compare evidence',   'data',     5);

-- Q17 satisfaction
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(17, 'discovered_new',  'I discovered something new',      'data',     1),
(17, 'made_enjoy',      'I made something people enjoy',   'creative', 2),
(17, 'helped_succeed',  'I helped someone succeed',        'people',   3),
(17, 'built_works',     'I built something that works',    'tech',     4),
(17, 'clear_target',    'I reached a clear target',        'business', 5);

-- Q18 priorities
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(18, 'high_salary',       'High salary',              null, 1),
(18, 'work_life_balance', 'Work-life balance',        null, 2),
(18, 'job_stability',     'Job stability',            null, 3),
(18, 'creative_freedom',  'Creative freedom',         null, 4),
(18, 'helping_others',    'Helping others',           null, 5),
(18, 'fast_growth',       'Fast career growth',       null, 6),
(18, 'remote_flexible',   'Remote or flexible work',  null, 7),
(18, 'learning_new',      'Learning new things',      null, 8);

-- Q19 learning time
insert into public.question_options (question_id, code, label, field_code, sort_order) values
(19, 'lt_2',  'Less than 2 hours',  null, 1),
(19, '2_5',   '2–5 hours',          null, 2),
(19, '5_10',  '5–10 hours',         null, 3),
(19, 'gt_10', 'More than 10 hours', null, 4);
