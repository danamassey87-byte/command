-- Communication log for tracking calls, texts, emails sent outside Command Center
create table if not exists communication_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) not null,
  type text not null check (type in ('phone_call', 'text_message', 'external_email', 'note', 'meeting', 'other')),
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound')),
  subject text,
  summary text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_comms_contact on communication_log(contact_id);
create index if not exists idx_comms_logged on communication_log(logged_at desc);
