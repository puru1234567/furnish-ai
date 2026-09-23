-- FurnishAI Admin Portal - Phase 9: notifications and support
-- Run after vendor-operations-schema.sql and admin-users-roles-schema.sql.

alter table public.vendor_support_tickets add column if not exists assigned_to uuid references public.profiles(id);
alter table public.vendor_support_tickets add column if not exists closed_at timestamptz;
alter table public.vendor_support_tickets drop constraint if exists vendor_support_tickets_status_check;
alter table public.vendor_support_tickets add constraint vendor_support_tickets_status_check check (status in ('open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed'));
alter table public.vendor_support_tickets drop constraint if exists vendor_support_tickets_priority_check;
alter table public.vendor_support_tickets add constraint vendor_support_tickets_priority_check check (priority in ('low', 'medium', 'high', 'critical'));

create table if not exists public.vendor_support_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.vendor_support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_communications (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  audience_type text not null check (audience_type in ('platform', 'vendor', 'vendor_group')),
  vendor_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_communication_recipients (
  communication_id uuid not null references public.admin_communications(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid references public.vendor_notifications(id) on delete set null,
  primary key (communication_id, vendor_id)
);

create index if not exists idx_support_tickets_assignee on public.vendor_support_tickets(assigned_to, status, updated_at desc);
create index if not exists idx_support_internal_notes_ticket on public.vendor_support_internal_notes(ticket_id, created_at desc);
create index if not exists idx_admin_communications_created on public.admin_communications(created_at desc);

alter table public.vendor_support_internal_notes enable row level security;
alter table public.admin_communications enable row level security;
alter table public.admin_communication_recipients enable row level security;

-- Internal notes and communications are server-side Admin data. They are never exposed by vendor queries.
