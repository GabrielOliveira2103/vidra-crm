begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('lead-arquivos','lead-arquivos',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy crm_storage_select on storage.objects for select to authenticated
using (bucket_id = 'lead-arquivos' and (select public.crm_autorizado()));
create policy crm_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'lead-arquivos' and (select public.crm_autorizado()) and exists(select 1 from public.leads where id::text = (storage.foldername(name))[1]));
create policy crm_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'lead-arquivos' and (select public.crm_autorizado()));
commit;
