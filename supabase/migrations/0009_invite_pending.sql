-- Invited-but-not-yet-accepted team members show as PENDING on the Team page.
alter table profiles add column if not exists invite_pending boolean not null default false;
