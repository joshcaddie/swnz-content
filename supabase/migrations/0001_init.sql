-- SWNZ Content — initial schema
-- Single agency (SWNZ) with many school clients. Team authenticates (email/password);
-- school clients access requests via an unguessable token through Edge Functions only.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type answer_status as enum ('todo', 'submitted', 'approved', 'changes_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type author_type as enum ('team', 'client');
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
-- URL-safe random token for password-less client request links.
create or replace function gen_request_token() returns text
language sql volatile as $$
  select translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_x');
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles (team users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_color text not null default '#5fd0c0',
  role text not null default 'member',
  created_at timestamptz not null default now()
);

-- Create a profile automatically on signup (name comes from signUp metadata).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- clients (schools) ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  color text not null default '#9fb6e6',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated before update on clients for each row execute function set_updated_at();

-- ---------- stages (board columns) ----------
create table stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- templates ----------
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  structure jsonb not null default '{"pages":[]}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger templates_updated before update on templates for each row execute function set_updated_at();

-- ---------- requests ----------
create table requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references clients(id) on delete set null,
  stage_id uuid references stages(id) on delete set null,
  owner_id uuid references profiles(id) on delete set null,
  -- Display fallback for the owner avatar when owner_id is null (imported/seed data,
  -- or an owner who isn't a system user). App prefers the linked profile when present.
  owner_name text,
  owner_initials text,
  owner_color text,
  due_date date,
  folder text not null default 'Default Folder',
  status_badge text,
  reminders_enabled boolean not null default true,
  verify_email boolean not null default false,
  public_token text not null unique default gen_request_token(),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on requests (stage_id, position);
create index on requests (client_id);
create trigger requests_updated before update on requests for each row execute function set_updated_at();

-- ---------- request structure (pages → sections → fields) ----------
create table request_pages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  name text not null default 'Untitled page',
  position int not null default 0
);
create index on request_pages (request_id, position);

create table request_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references request_pages(id) on delete cascade,
  name text not null default 'Untitled section',
  instructions text,
  repeatable boolean not null default false,
  conditions boolean not null default false,
  position int not null default 0
);
create index on request_sections (page_id, position);

create table request_fields (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references request_sections(id) on delete cascade,
  type text not null,
  label text not null default '',
  config jsonb not null default '{}'::jsonb,
  tag text,
  position int not null default 0
);
create index on request_fields (section_id, position);

-- ---------- answers ----------
create table answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  field_id uuid not null references request_fields(id) on delete cascade,
  value jsonb,
  status answer_status not null default 'todo',
  submitted_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (field_id)
);
create index on answers (request_id);
create trigger answers_updated before update on answers for each row execute function set_updated_at();

create table answer_files (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references answers(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  size int not null default 0,
  content_type text,
  created_at timestamptz not null default now()
);
create index on answer_files (answer_id);

-- ---------- comments ----------
create table comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  field_id uuid references request_fields(id) on delete cascade,
  author_type author_type not null,
  author_id text,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index on comments (request_id);

-- ---------- default board stages ----------
insert into stages (name, position) values
  ('Unassigned', 0),
  ('Home page', 1),
  ('In Design', 2),
  ('Inner page awaiting', 3),
  ('In development', 4);

-- ---------- storage ----------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
