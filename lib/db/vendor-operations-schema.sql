-- FurnishAI Vendor Portal - Phase 7: operations
-- Run after vendor-onboarding-schema.sql. File bodies belong in private storage.

create table if not exists public.vendor_notifications (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, body text not null, action_label text, action_href text,
  created_at timestamptz not null default now(), read_at timestamptz
);

create table if not exists public.vendor_notification_preferences (
  vendor_id uuid primary key references public.profiles(id) on delete cascade,
  product_updates boolean not null default true, import_updates boolean not null default true,
  listing_updates boolean not null default true, announcements boolean not null default true,
  inventory_alerts boolean not null default true, document_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  requirement_id text not null, file_name text, storage_path text, status text not null default 'missing' check (status in ('missing', 'pending', 'verified', 'rejected', 'action_required')),
  rejection_reason text, expires_at date, uploaded_at timestamptz, updated_at timestamptz not null default now(), unique(vendor_id, requirement_id)
);

create table if not exists public.vendor_support_tickets (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null, category text not null, priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.vendor_support_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.vendor_support_tickets(id) on delete cascade,
  author_type text not null check (author_type in ('vendor', 'support')), author_id uuid references public.profiles(id), body text not null, created_at timestamptz not null default now()
);

create table if not exists public.vendor_support_attachments (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.vendor_support_messages(id) on delete cascade,
  file_name text not null, storage_path text not null, size_bytes bigint not null default 0
);

create index if not exists idx_vendor_notifications_vendor_date on public.vendor_notifications(vendor_id, created_at desc);
create index if not exists idx_vendor_documents_vendor on public.vendor_documents(vendor_id);
create index if not exists idx_vendor_support_tickets_vendor_date on public.vendor_support_tickets(vendor_id, updated_at desc);
create index if not exists idx_vendor_support_messages_ticket on public.vendor_support_messages(ticket_id, created_at);

alter table public.vendor_notifications enable row level security;
alter table public.vendor_notification_preferences enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.vendor_support_tickets enable row level security;
alter table public.vendor_support_messages enable row level security;
alter table public.vendor_support_attachments enable row level security;

create policy "Vendors can manage own notifications" on public.vendor_notifications for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
create policy "Vendors can manage own notification preferences" on public.vendor_notification_preferences for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
create policy "Vendors can manage own documents" on public.vendor_documents for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
create policy "Vendors can manage own support tickets" on public.vendor_support_tickets for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
create policy "Vendors can manage own support messages" on public.vendor_support_messages for all using (exists (select 1 from public.vendor_support_tickets t where t.id = ticket_id and t.vendor_id = auth.uid()));
create policy "Vendors can manage own support attachments" on public.vendor_support_attachments for all using (exists (select 1 from public.vendor_support_messages m join public.vendor_support_tickets t on t.id = m.ticket_id where m.id = message_id and t.vendor_id = auth.uid()));

-- TODO: support/admin service role policies and private storage bucket policies.