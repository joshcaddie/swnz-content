-- Board column for completed/archived projects.
insert into stages (name, position)
select 'Archived', coalesce(max(position), 0) + 1 from stages
where not exists (select 1 from stages where name = 'Archived');
