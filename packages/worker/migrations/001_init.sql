create table if not exists orgs (
  id serial primary key,
  slug text unique not null,
  name text not null,
  domain text not null,
  segment text not null,
  products text[] not null,
  ats text,                                  -- from watchlist config
  ats_detected text,                         -- from auto-detection
  status text not null default 'active',
  consecutive_failures int not null default 0,
  first_scanned_at timestamptz,              -- set on first completed applyDiff; backs orgHasHistory
  created_at timestamptz not null default now()
);

create table if not exists postings (
  id serial primary key,
  org_id int not null references orgs(id),
  external_id text not null,
  title text not null,
  url text not null,
  location text,
  department text,
  description text not null,
  content_hash text not null,
  published_at timestamptz,
  is_baseline boolean not null default false,
  prefilter_pass boolean not null default false,
  prefilter_matches text[] not null default '{}',
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  removed_at timestamptz,
  unique (org_id, external_id)
);
create index if not exists postings_org_active on postings (org_id) where removed_at is null;

create table if not exists scan_runs (
  id serial primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  orgs_scanned int not null default 0,
  orgs_failed int not null default 0,
  postings_found int not null default 0,
  postings_new int not null default 0,
  postings_removed int not null default 0,
  errors jsonb not null default '[]'
);
