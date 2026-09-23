-- FurnishAI Vendor Portal - Storage: vendor document uploads
-- Run after vendor-operations-schema.sql. Provides the private bucket and RLS
-- policies backing POST /api/vendor/documents and PUT /api/vendor/documents/[id].
-- Objects are stored at path `${vendor_id}/${requirement_id}-${filename}` so a
-- vendor's own folder segment can be checked against auth.uid().

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

drop policy if exists "Vendors can manage own document uploads" on storage.objects;
create policy "Vendors can manage own document uploads" on storage.objects
  for all
  using (bucket_id = 'vendor-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'vendor-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- TODO: add a service-role/admin read policy once the document review UI needs to fetch vendor files.
