-- Two-brand split: everything client-facing belongs to either 'swnz' or 'caddie'.
-- Existing rows default to swnz (the original dashboard).

alter table clients   add column if not exists brand text not null default 'swnz';
alter table requests  add column if not exists brand text not null default 'swnz';
alter table templates add column if not exists brand text not null default 'swnz';
create index if not exists requests_brand_idx on requests (brand);

-- create_request now stamps the brand (old 6-arg signature replaced).
drop function if exists create_request(text, uuid, uuid, date, text, jsonb);
create or replace function create_request(
  p_name text, p_client uuid, p_stage uuid, p_due date, p_folder text, p_structure jsonb,
  p_brand text default 'swnz'
) returns uuid
language plpgsql security invoker as $$
declare rid uuid; pg jsonb; sec jsonb; fld jsonb; pid uuid; sid uuid; ppos int := 0; spos int; fpos int;
begin
  insert into requests (name, client_id, stage_id, due_date, folder, brand)
    values (p_name, p_client, p_stage, p_due, coalesce(nullif(p_folder, ''), 'Default Folder'),
            coalesce(nullif(p_brand, ''), 'swnz'))
    returning id into rid;

  for pg in select value from jsonb_array_elements(coalesce(p_structure->'pages', '[]'::jsonb)) loop
    insert into request_pages (request_id, name, position, indent, nav_only)
      values (rid, coalesce(pg->>'name', 'Untitled page'), ppos,
              coalesce((pg->>'indent')::int, 0), coalesce((pg->>'navOnly')::bool, false))
      returning id into pid;
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

grant execute on function create_request(text, uuid, uuid, date, text, jsonb, text) to authenticated, service_role;
