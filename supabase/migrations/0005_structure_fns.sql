-- Clone a template/blank structure (jsonb) into the relational request tables, and the
-- reverse (export a request's structure as jsonb for "save as template").
-- security invoker => the caller's RLS applies (team only).

create or replace function create_request(
  p_name text, p_client uuid, p_stage uuid, p_due date, p_folder text, p_structure jsonb
) returns uuid
language plpgsql security invoker as $$
declare rid uuid; pg jsonb; sec jsonb; fld jsonb; pid uuid; sid uuid; ppos int := 0; spos int; fpos int;
begin
  insert into requests (name, client_id, stage_id, due_date, folder)
    values (p_name, p_client, p_stage, p_due, coalesce(nullif(p_folder, ''), 'Default Folder'))
    returning id into rid;

  for pg in select value from jsonb_array_elements(coalesce(p_structure->'pages', '[]'::jsonb)) loop
    insert into request_pages (request_id, name, position)
      values (rid, coalesce(pg->>'name', 'Untitled page'), ppos) returning id into pid;
    spos := 0;
    for sec in select value from jsonb_array_elements(coalesce(pg->'sections', '[]'::jsonb)) loop
      insert into request_sections (page_id, name, instructions, repeatable, conditions, position)
        values (pid, coalesce(sec->>'name', 'Untitled section'), sec->>'instructions',
                coalesce((sec->>'repeatable')::bool, false), coalesce((sec->>'conditions')::bool, false), spos)
        returning id into sid;
      fpos := 0;
      for fld in select value from jsonb_array_elements(coalesce(sec->'fields', '[]'::jsonb)) loop
        insert into request_fields (section_id, type, label, config, tag, position)
          values (sid, coalesce(fld->>'type', 'single_line'), coalesce(fld->>'label', ''),
                  coalesce(fld->'config', '{}'::jsonb), fld->>'tag', fpos);
        fpos := fpos + 1;
      end loop;
      spos := spos + 1;
    end loop;
    ppos := ppos + 1;
  end loop;
  return rid;
end $$;

create or replace function request_structure(p_request uuid) returns jsonb
language sql stable security invoker as $$
  select jsonb_build_object('pages', coalesce(jsonb_agg(
    jsonb_build_object(
      'name', p.name,
      'sections', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', s.name,
            'instructions', s.instructions,
            'repeatable', s.repeatable,
            'conditions', s.conditions,
            'fields', coalesce((
              select jsonb_agg(
                jsonb_build_object('type', f.type, 'label', f.label, 'config', f.config, 'tag', f.tag)
                order by f.position)
              from request_fields f where f.section_id = s.id
            ), '[]'::jsonb)
          ) order by s.position)
        from request_sections s where s.page_id = p.id
      ), '[]'::jsonb)
    ) order by p.position
  ), '[]'::jsonb))
  from request_pages p where p.request_id = p_request;
$$;

grant execute on function create_request(text, uuid, uuid, date, text, jsonb) to authenticated, service_role;
grant execute on function request_structure(uuid) to authenticated, service_role;
