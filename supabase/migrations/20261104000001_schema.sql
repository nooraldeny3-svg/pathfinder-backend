-- =====================================================================
-- PathFinder AI - database schema
-- Run this FIRST in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Create a profile row automatically when someone signs up.
-- The frontend sends full_name in signUp(..., { options: { data: { full_name } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. CAREER FIELDS (the 5 fields shown on the results page)
-- ---------------------------------------------------------------------
create table if not exists public.career_fields (
  code         text primary key,          -- data | creative | people | tech | business
  name         text not null,             -- "Data / Research"
  short_label  text not null,             -- "Data" (radar chart label)
  description  text not null,             -- default explanation sentence
  q3_skill     text not null,             -- related general skill in Q3
  sort_order   int  not null default 0
);

create table if not exists public.careers (
  id          serial primary key,
  field_code  text not null references public.career_fields (code) on delete cascade,
  title       text not null,
  sort_order  int  not null default 0
);

create table if not exists public.work_environments (
  id          serial primary key,
  field_code  text not null references public.career_fields (code) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0
);

create table if not exists public.field_skills (
  id          serial primary key,
  field_code  text not null references public.career_fields (code) on delete cascade,
  name        text not null,              -- "SQL & Excel"
  base_skill  text not null,              -- Q3 skill used to estimate it: communication | analytical | technical | creativity | leadership
  target      int  not null default 80,   -- target level in %
  sort_order  int  not null default 0
);

-- ---------------------------------------------------------------------
-- 3. QUESTIONNAIRE
-- ---------------------------------------------------------------------
create table if not exists public.sections (
  id           smallint primary key,
  title        text not null,
  description  text,
  sort_order   int not null default 0
);

create table if not exists public.questions (
  id          smallint primary key,       -- question number 1..20
  section_id  smallint not null references public.sections (id),
  code        text not null unique,       -- e.g. "study_field"
  label       text,                       -- small label above the title, e.g. "STUDY FIELD"
  title       text not null,
  subtitle    text,
  type        text not null check (type in
               ('dropdown','single_choice','rating_grid','multi_select',
                'scale','most_least','ranking','text')),
  field_code  text references public.career_fields (code),  -- used by interest questions (Q5-Q14)
  required    boolean not null default true,
  settings    jsonb not null default '{}'::jsonb             -- e.g. {"min":1,"max":5} or {"count":3}
);

create table if not exists public.question_options (
  id           serial primary key,
  question_id  smallint not null references public.questions (id) on delete cascade,
  code         text not null,             -- value saved in answers, e.g. "computer_science"
  label        text not null,             -- text shown to the user
  field_code   text references public.career_fields (code),   -- which field this option points to
  sort_order   int not null default 0,
  unique (question_id, code)
);

-- One row per user per question. Saving again overwrites the old answer.
create table if not exists public.answers (
  user_id      uuid not null references auth.users (id) on delete cascade,
  question_id  smallint not null references public.questions (id) on delete cascade,
  value        jsonb,
  updated_at   timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ---------------------------------------------------------------------
-- 4. RESULTS
-- ---------------------------------------------------------------------
create table if not exists public.results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  scores      jsonb not null,             -- {"data":73,"creative":62,"people":58,"tech":58,"business":57}
  top_fields  text[] not null,            -- ["data","creative","people"]
  is_saved    boolean not null default false,   -- "Save results" / "Save to my profile"
  share_id    uuid not null unique default gen_random_uuid(),  -- used for the Share link
  ai_used     boolean not null default false,   -- false = fallback text was used
  created_at  timestamptz not null default now()
);

create index if not exists results_user_idx on public.results (user_id, created_at desc);

-- Details for each of the top 3 fields ("View details" page)
create table if not exists public.result_details (
  id             serial primary key,
  result_id      uuid not null references public.results (id) on delete cascade,
  field_code     text not null references public.career_fields (code),
  rank           int  not null,           -- 1, 2, 3
  match_percent  int  not null,
  explanation    text not null,
  skill_gaps     jsonb not null,          -- [{"skill":"SQL & Excel","current":45,"target":80}, ...]
  roadmap        jsonb not null,          -- [{"months":6,"step":"..."}, {"months":9,...}, {"months":12,...}]
  unique (result_id, field_code)
);

-- ---------------------------------------------------------------------
-- 5. ACCESS
-- RLS is intentionally NOT enabled (team decision for the prototype).
-- These grants let the frontend read/write the tables with the public key.
-- ---------------------------------------------------------------------
-- Some new Supabase projects turn RLS on automatically for new tables.
-- With RLS on and no policies, the frontend would get empty results, so we
-- switch it off explicitly. (To add security later, enable RLS + add policies.)
alter table public.profiles          disable row level security;
alter table public.career_fields     disable row level security;
alter table public.careers           disable row level security;
alter table public.work_environments disable row level security;
alter table public.field_skills      disable row level security;
alter table public.sections          disable row level security;
alter table public.questions         disable row level security;
alter table public.question_options  disable row level security;
alter table public.answers           disable row level security;
alter table public.results           disable row level security;
alter table public.result_details    disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
