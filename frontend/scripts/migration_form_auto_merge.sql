-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Auto-merge public_form_submissions into contacts
--
-- When a public intake form is submitted:
--   1. Find an existing contact by normalized email → phone → name
--   2. If found: merge into the contact (fill blanks, append new related_people)
--   3. If not: create a new contact with type inferred from the form slug
--   4. Store the resulting contact_id back on the submission row for traceability
--
-- Runs as SECURITY DEFINER so anonymous form submissions can write contacts.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Trace column so we can see which contact a submission merged into.
alter table public_form_submissions
  add column if not exists merged_contact_id uuid references contacts(id) on delete set null;

alter table public_form_submissions
  add column if not exists merged_at timestamptz;

create index if not exists pfs_merged_contact_idx
  on public_form_submissions(merged_contact_id)
  where merged_contact_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- merge_submission_into_contact(submission_id)
--   Main merge function. Returns the contact_id that was matched or created.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function merge_submission_into_contact(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  data_json jsonb;
  client_email text;
  client_phone text;
  client_name text;
  related_all jsonb;
  key_iter text;
  val_iter jsonb;
  existing_contact_id uuid;
  new_contact_id uuid;
  form_type text;
  contact_type text;
  norm_email text;
  norm_phone text;
begin
  select * into sub from public_form_submissions where id = p_submission_id;
  if sub is null then return null; end if;

  data_json := coalesce(sub.data, '{}'::jsonb);
  client_name := nullif(trim(coalesce(sub.client_name, '')), '');

  -- Extract contact fields from form data (accept a few common key variants).
  client_email := coalesce(
    data_json->>'email',
    data_json->>'email_address',
    data_json->>'contact_email'
  );
  client_phone := coalesce(
    data_json->>'phone',
    data_json->>'phone_number',
    data_json->>'contact_phone',
    data_json->>'mobile',
    data_json->>'tel'
  );

  -- Fallback: also pull full_name / name if client_name is missing
  if client_name is null then
    client_name := nullif(trim(coalesce(
      data_json->>'full_name',
      data_json->>'name',
      data_json->>'client_name'
    )), '');
  end if;

  -- Normalize for matching
  norm_email := nullif(lower(trim(coalesce(client_email, ''))), '');
  norm_phone := nullif(regexp_replace(coalesce(client_phone, ''), '[^0-9]', '', 'g'), '');

  -- Collect any field whose value is a JSON array of people (supports
  -- multiple related_people fields across different sections).
  related_all := '[]'::jsonb;
  for key_iter, val_iter in select * from jsonb_each(data_json) loop
    if jsonb_typeof(val_iter) = 'array'
       and jsonb_array_length(val_iter) > 0
       and jsonb_typeof(val_iter->0) = 'object'
       and (val_iter->0 ? 'first_name' or val_iter->0 ? 'relationship') then
      related_all := related_all || val_iter;
    end if;
  end loop;

  -- Infer contact type from the form slug prefix: buyer-* / seller-* / lead-*
  form_type := split_part(coalesce(sub.form_slug, ''), '-', 1);
  contact_type := case
    when form_type = 'buyer' then 'buyer'
    when form_type = 'seller' then 'seller'
    when form_type = 'investor' then 'investor'
    else 'lead'
  end;

  -- ─── Match existing contact by email, then phone, then name ─────────────
  if norm_email is not null then
    select id into existing_contact_id
      from contacts
      where email_normalized = norm_email
        and deleted_at is null
      limit 1;
  end if;

  if existing_contact_id is null and norm_phone is not null then
    select id into existing_contact_id
      from contacts
      where phone_normalized = norm_phone
        and deleted_at is null
      limit 1;
  end if;

  if existing_contact_id is null and client_name is not null then
    select id into existing_contact_id
      from contacts
      where lower(trim(name)) = lower(client_name)
        and deleted_at is null
      limit 1;
  end if;

  if existing_contact_id is not null then
    -- ─── MERGE into existing contact ────────────────────────────────────────
    update contacts set
      name           = coalesce(nullif(name, ''),  client_name),
      email          = coalesce(email,             client_email),
      phone          = coalesce(phone,             client_phone),
      -- Append all new related_people items to whatever's already on the contact
      related_people = coalesce(related_people, '[]'::jsonb) || related_all,
      -- Upgrade type if incoming form supplies a more specific role
      type           = case
        when type is null or type = 'lead' then contact_type
        when type = 'buyer' and contact_type = 'seller' then 'both'
        when type = 'seller' and contact_type = 'buyer' then 'both'
        else type
      end,
      updated_at     = now()
    where id = existing_contact_id;
  else
    -- ─── CREATE new contact ─────────────────────────────────────────────────
    insert into contacts (name, email, phone, type, source, related_people)
    values (
      coalesce(client_name, 'Intake Form Lead'),
      nullif(client_email, ''),
      nullif(client_phone, ''),
      contact_type,
      'Intake Form',
      related_all
    )
    returning id into new_contact_id;
    existing_contact_id := new_contact_id;
  end if;

  -- Trace back on the submission
  update public_form_submissions set
    merged_contact_id = existing_contact_id,
    merged_at = now()
  where id = p_submission_id;

  return existing_contact_id;
exception when others then
  -- Swallow errors so a bad submission never blocks the insert
  raise notice 'merge_submission_into_contact failed for %: %', p_submission_id, sqlerrm;
  return null;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Trigger: auto-merge every new submission
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function trg_auto_merge_submission() returns trigger as $$
begin
  perform merge_submission_into_contact(new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pfs_auto_merge on public_form_submissions;
create trigger trg_pfs_auto_merge
  after insert on public_form_submissions
  for each row execute function trg_auto_merge_submission();

notify pgrst, 'reload schema';
