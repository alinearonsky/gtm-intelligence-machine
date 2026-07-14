-- packages/worker/migrations/003_org_narratives.sql
create table if not exists org_narratives (
  org_id int not null references orgs(id),
  lens text not null,
  narrative text not null,
  model text not null,
  prompt_version text not null,
  source_signature text not null,
  generated_at timestamptz not null default now(),
  primary key (org_id, lens)
);
