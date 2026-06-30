-- Optional email-code verification for the password-less client portal.
-- Used only when a request has verify_email = true. Codes are short-lived and single-purpose.
-- All access is via Edge Functions (service role); no team/anon policies needed.

create table client_verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on client_verifications (request_id, email);

alter table client_verifications enable row level security;
-- No policies: only the service role (Edge Functions) may touch this table.

grant all on all tables in schema public to authenticated, service_role;
