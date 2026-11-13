-- PlaySurvey Story Mode: surveys, responses and events.
-- The app reaches these tables only from the server with the service role key,
-- so row-level security is on with no public policies: the anon key can read nothing.

create table if not exists public.surveys (
  id text primary key,
  slug text not null unique,
  status text not null check (status in ('draft', 'live')),
  body jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.responses (
  id text primary key,
  survey_id text not null references public.surveys (id) on delete cascade,
  arm text not null check (arm in ('story', 'plain')),
  switched_to_plain boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  enjoyment int check (enjoyment between 0 and 4),
  visitor_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists responses_survey_idx on public.responses (survey_id);

create table if not exists public.events (
  id bigserial primary key,
  survey_id text not null references public.surveys (id) on delete cascade,
  response_id text references public.responses (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists events_survey_idx on public.events (survey_id);

alter table public.surveys enable row level security;
alter table public.responses enable row level security;
alter table public.events enable row level security;
