-- packages/worker/migrations/002_extraction_rules_lens.sql
create table if not exists extractions (
  id serial primary key,
  posting_id int not null references postings(id),
  role_category text not null,
  seniority text not null,
  standards_mentioned text[] not null default '{}',
  clinical_domain text,
  team_context text,
  function_type text not null,
  confidence real not null,
  model text not null,
  prompt_version text not null,
  status text not null default 'ok',        -- 'ok' | 'failed'
  created_at timestamptz not null default now(),
  unique (posting_id, prompt_version)
);

create table if not exists signals (
  id serial primary key,
  org_id int not null references orgs(id),
  source_type text not null default 'job_posting',
  signal_type text not null,
  stage text not null,
  strength int not null,
  rule_id text not null,
  evidence_key text not null,
  evidence jsonb not null,
  confidence real not null,
  is_baseline_assessment boolean not null default false,
  rules_version int not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  unique (org_id, rule_id, evidence_key)
);

create table if not exists lens_scores (
  id serial primary key,
  signal_id int not null references signals(id) on delete cascade,
  lens text not null,
  priority text not null,
  rationale text not null,
  rubric_version int not null,
  created_at timestamptz not null default now(),
  unique (signal_id, lens)
);
