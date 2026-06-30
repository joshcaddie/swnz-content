-- Demo data for SWNZ Content — ports the original prototype board so the app isn't empty.
-- Safe to skip in production. Owners use display-fallback fields (no auth users needed).

-- Helper: attach the standard "design brief" structure to a request, returning nothing.
create or replace function pg_temp.apply_design_brief(req uuid) returns void
language plpgsql as $$
declare pg uuid; sec uuid;
begin
  insert into request_pages (request_id, name, position) values (req, 'Home page', 0) returning id into pg;
  insert into request_sections (page_id, name, position) values (pg, 'Get started', 0) returning id into sec;
  insert into request_fields (section_id, type, label, position) values
    (sec, 'single_line', 'What is your website address?', 0),
    (sec, 'multiline', 'Please list at least 3 websites that you like and specifically what you like about them.', 1),
    (sec, 'multiline', 'What are your goals of the new website?', 2),
    (sec, 'single_line', 'What colours represent your School?', 3),
    (sec, 'multiline', 'Do you have a tagline, Values, Vision?', 4),
    (sec, 'file', 'Logos, Brandkit, Strategic Plan docs', 5),
    (sec, 'image', 'Main header images', 6),
    (sec, 'multiline', 'What forms of communication and engagement do you use?', 7),
    (sec, 'single_line', 'Ideally, when would you like to have the new site live?', 8),
    (sec, 'single_line', 'Do you have your web content ready?', 9),
    (sec, 'single_line', 'Are you interested in moving to a new provider?', 10);
end $$;

-- Helper: create a client + request in one go and attach the standard structure.
create or replace function pg_temp.seed_request(
  p_client text, p_email text, p_color text,
  p_name text, p_stage text, p_owner text, p_initials text, p_owner_color text,
  p_badge text, p_due date
) returns uuid
language plpgsql as $$
declare cid uuid; rid uuid; sid uuid;
begin
  select id into sid from stages where name = p_stage;
  insert into clients (name, contact_name, contact_email, color)
    values (p_client, p_owner, p_email, p_color)
    returning id into cid;
  insert into requests (name, client_id, stage_id, owner_name, owner_initials, owner_color, status_badge, due_date)
    values (p_name, cid, sid, p_owner, p_initials, p_owner_color, p_badge, p_due)
    returning id into rid;
  perform pg_temp.apply_design_brief(rid);
  return rid;
end $$;

do $$
declare oranga uuid; ross uuid; pg uuid; sec uuid; f_text uuid; f_img uuid; a_text uuid; a_img uuid;
begin
  -- Unassigned
  perform pg_temp.seed_request('Greytown School','office@greytown.school.nz','#9fb6e6','Greytown School - inner pages content','Unassigned','Jody Hart','JH','#f2c94c','PUBLISHED','2026-07-12');

  -- Home page (Oranga is the showcase "design brief" with one answered question)
  oranga := pg_temp.seed_request('Oranga School','principal@oranga.school.nz','#86d29a','Oranga School - Design brief','Home page','Bridget Lummis','BL','#86d29a',null,'2026-07-12');
  update requests set verify_email = false where id = oranga;
  -- mark the first question answered+approved so it reads 1/11
  select rf.id into f_text from request_fields rf
    join request_sections rs on rs.id = rf.section_id
    join request_pages rp on rp.id = rs.page_id
    where rp.request_id = oranga and rf.position = 0;
  insert into answers (request_id, field_id, value, status, submitted_at, approved_at)
    values (oranga, f_text, '"https://www.oranga.school.nz"'::jsonb, 'approved', now(), now());

  perform pg_temp.seed_request('Patumahoe School','office@patumahoe.school.nz','#9fb6e6','Patumahoe School - Design brief','Home page','Keryn Grey','KG','#9fb6e6','OVERDUE','2026-06-23');
  perform pg_temp.seed_request('Hingaia Peninsula School','office@hingaia.school.nz','#5fd0c0','Hingaia Peninsula School - Design brief','Home page','Carly Kidd','CK','#5fd0c0',null,'2026-07-20');
  perform pg_temp.seed_request('Hamilton West School','office@hamiltonwest.school.nz','#5cd1b8','Hamilton West School Website','Home page','Frank Young','FY','#5cd1b8',null,'2026-07-22');

  -- In Design
  perform pg_temp.seed_request('Greytown School 2','office2@greytown.school.nz','#f2c94c','Greytown School - Design brief','In Design','Jody Hart','JH','#f2c94c','ARCHIVED','2026-07-02');
  perform pg_temp.seed_request('TKKM o Te Wananga Whare','office@tkkm.school.nz','#f49ac1','TKKM o Te Wananga Whare Tapere','In Design','Fleur','F','#f49ac1',null,'2026-07-15');
  perform pg_temp.seed_request('Waitutu Holdings','office@waitutu.co.nz','#f2c94c','Waitutu Holdings Website design','In Design','Daniel','D','#f2c94c','ARCHIVED','2026-02-11');
  perform pg_temp.seed_request('Pinehill School','office@pinehill.school.nz','#9fb6e6','Pinehill School - Redesign','In Design','Tracey Danks','TD','#9fb6e6','ARCHIVED','2026-06-07');

  -- Inner page awaiting (Ross is the showcase, submitted + approved)
  perform pg_temp.seed_request('Core Foundations','office@corefoundations.co.nz','#5fd0c0','Core Foundations - inner pages','Inner page awaiting','Rebecca McLeod','RM','#5fd0c0','PUBLISHED','2026-07-08');
  perform pg_temp.seed_request('Henderson Intermediate School','office@henderson.school.nz','#f49ac1','Henderson Intermediate School','Inner page awaiting','Shania Hammon','SH','#f49ac1','OVERDUE','2026-06-28');
  perform pg_temp.seed_request('Rapaura School','office@rapaura.school.nz','#9fb6e6','Rapaura School - inner pages','Inner page awaiting','Carey Huria','CH','#9fb6e6',null,'2026-07-30');

  -- Ross: custom inner-pages structure with both answers submitted & approved
  select id into ross from stages where name = 'Inner page awaiting'; -- reuse var as stage id temporarily
  insert into clients (name, contact_name, contact_email, color)
    values ('Ross School','Jodie Linklater','principal@ross.school.nz','#c9a8e9') returning id into oranga; -- reuse var as client id
  insert into requests (name, client_id, stage_id, owner_name, owner_initials, owner_color, status_badge, due_date)
    values ('Ross School - inner pages content', oranga, ross, 'Jodie Linklater','JL','#c9a8e9','OVERDUE','2026-03-01')
    returning id into ross;
  insert into request_pages (request_id, name, position) values (ross, 'Home', 0) returning id into pg;
  insert into request_sections (page_id, name, position) values (pg, 'Homepage welcome text', 0) returning id into sec;
  insert into request_fields (section_id, type, label, position) values (sec, 'formatted', 'Text for this page', 0) returning id into f_text;
  insert into request_fields (section_id, type, label, tag, config, position)
    values (sec, 'image', 'Images for this page', 'Multi Answer: 9', '{"multi":true,"maxFiles":9}'::jsonb, 1) returning id into f_img;
  -- extra pages so the checklist looks real
  insert into request_pages (request_id, name, position) values
    (ross, 'Our School', 1), (ross, 'Our Learning', 2), (ross, 'Whānau Information', 3),
    (ross, 'News & Events', 4), (ross, 'Contact', 5);
  insert into answers (request_id, field_id, value, status, submitted_at, approved_at)
    values (ross, f_text,
      to_jsonb('<p>Nau mai, haere mai – Welcome to Ross School</p><p>Located on the beautiful West Coast, our community is built on a proud gold mining history, famously home to the 1909 discovery of New Zealand''s largest gold nugget, the "Honourable Roddy." Having proudly celebrated our 150th anniversary in 2025, we continue that rich legacy of learning and community spirit today.</p><p>Just as the early miners searched for treasure, our mission is to uncover the "gold" within every single student by providing a genuinely welcoming, inclusive, and supportive environment where every child is valued.</p><p>Whether your family has been on the Coast for generations or you are brand new to town, we are absolutely thrilled to have you join our school family.</p><p>Ngā mihi nui,</p><p>The Ross School Team</p>'::text),
      'approved', now(), now())
    returning id into a_text;
  insert into answers (request_id, field_id, value, status, submitted_at, approved_at)
    values (ross, f_img, '[]'::jsonb, 'approved', now(), now()) returning id into a_img;

  -- In development
  perform pg_temp.seed_request('Te Mataitihi School','office@temataitihi.school.nz','#9fb6e6','Te Mataitihi School - inner pages','In development','Linda Baran','LB','#9fb6e6',null,'2026-08-01');
  perform pg_temp.seed_request('Te Kura Kaupapa Maori','office@tkkmot.school.nz','#5fd0c0','Te Kura Kaupapa Māori o Te','In development','Sophie Kamariera','SK','#5fd0c0','DRAFT','2025-12-10');
  perform pg_temp.seed_request('St Anthonys School','office@stanthonys.school.nz','#7fd6a0','St Anthony''s School - inner pages','In development','Peta-Maree Parsonage','PP','#7fd6a0','ARCHIVED','2026-03-11');
  perform pg_temp.seed_request('St Josephs Hawera','office@stjosephs.school.nz','#9fb6e6','St Josephs Hawera - inner pages','In development','Tracey Drought','TD','#9fb6e6','ARCHIVED','2025-03-18');
end $$;

-- A couple of reusable templates for the wizard.
insert into templates (name, description, structure) values
  ('School-Name - Design brief', 'Standard pre-build design brief for a new school website.',
   '{"pages":[{"name":"Home page","sections":[{"name":"Get started","fields":[
      {"type":"single_line","label":"What is your website address?"},
      {"type":"multiline","label":"Please list at least 3 websites that you like and what you like about them."},
      {"type":"multiline","label":"What are your goals of the new website?"},
      {"type":"single_line","label":"What colours represent your School?"},
      {"type":"file","label":"Logos, Brandkit, Strategic Plan docs"},
      {"type":"image","label":"Main header images"}
   ]}]}]}'::jsonb),
  ('SchoolName - inner pages content', 'Collect inner-page text and images across the site.',
   '{"pages":[{"name":"Home","sections":[{"name":"Homepage welcome text","fields":[
      {"type":"formatted","label":"Text for this page"},
      {"type":"image","label":"Images for this page","tag":"Multi Answer: 9","config":{"multi":true,"maxFiles":9}}
   ]}]},{"name":"Our School","sections":[]},{"name":"Contact","sections":[]}]}'::jsonb);
