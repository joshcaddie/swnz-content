-- Per-request answer progress, used by the board cards and the reminder job.
-- security_invoker = true so the caller's RLS on the base tables still applies
-- (without it, the view would run as owner and bypass RLS — a data leak).

create or replace view request_progress
with (security_invoker = true) as
select
  r.id as request_id,
  count(rf.id)                                              as total,
  count(rf.id) filter (where a.status = 'approved')         as approved,
  count(rf.id) filter (where a.status = 'submitted')        as submitted,
  count(rf.id) filter (where a.status = 'changes_requested') as changes_requested,
  count(rf.id) filter (where a.status in ('submitted','approved')) as answered
from requests r
left join request_pages p   on p.request_id = r.id
left join request_sections s on s.page_id = p.id
left join request_fields rf on rf.section_id = s.id
left join answers a         on a.field_id = rf.id
group by r.id;

grant select on request_progress to authenticated, service_role;
