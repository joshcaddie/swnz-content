-- Row Level Security.
-- Model: any authenticated team member (a row in profiles) has full access to agency data.
-- Anonymous/public users get NOTHING here — the client portal goes through Edge Functions
-- running with the service role, which bypasses RLS.

-- Helper: is the caller a signed-in team member?
create or replace function is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

-- Enable RLS everywhere.
alter table profiles          enable row level security;
alter table clients           enable row level security;
alter table stages            enable row level security;
alter table templates         enable row level security;
alter table requests          enable row level security;
alter table request_pages     enable row level security;
alter table request_sections  enable row level security;
alter table request_fields    enable row level security;
alter table answers           enable row level security;
alter table answer_files      enable row level security;
alter table comments          enable row level security;

-- profiles: any team member can read the directory; you can update your own row.
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Generic full-access policy for team on agency tables.
create policy clients_team          on clients          for all to authenticated using (is_team()) with check (is_team());
create policy stages_team           on stages           for all to authenticated using (is_team()) with check (is_team());
create policy templates_team        on templates        for all to authenticated using (is_team()) with check (is_team());
create policy requests_team         on requests         for all to authenticated using (is_team()) with check (is_team());
create policy request_pages_team    on request_pages    for all to authenticated using (is_team()) with check (is_team());
create policy request_sections_team on request_sections for all to authenticated using (is_team()) with check (is_team());
create policy request_fields_team   on request_fields   for all to authenticated using (is_team()) with check (is_team());
create policy answers_team          on answers          for all to authenticated using (is_team()) with check (is_team());
create policy answer_files_team     on answer_files     for all to authenticated using (is_team()) with check (is_team());
create policy comments_team         on comments         for all to authenticated using (is_team()) with check (is_team());

-- Storage: team can read/manage objects in the uploads bucket. Client uploads are written
-- by the service role (Edge Function) which bypasses these policies.
create policy uploads_team_read on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and is_team());
create policy uploads_team_write on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and is_team());
create policy uploads_team_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and is_team());

-- Belt-and-suspenders: ensure base table/routine privileges exist (Supabase normally
-- grants these by default; making them explicit keeps the schema portable). RLS above is
-- the real gate — anon has no policies, so it sees nothing despite the grant.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all routines in schema public to anon, authenticated, service_role;
