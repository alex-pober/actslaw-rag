create schema private;

insert into storage.buckets (id, name)
values ('files', 'files')
on conflict do nothing;

create or replace function private.uuid_or_null(str text)
returns uuid
language plpgsql
as $$
begin
  return str::uuid;
  exception when invalid_text_representation then
    return null;
  end;
$$;

create policy "Authenticated users can upload files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'files' and
    owner = auth.uid() and
    private.uuid_or_null(path_tokens[1]) is not null
);

create policy "Users can view all files"
on storage.objects for select to authenticated using (
  bucket_id = 'files'
);

create policy "Users can update all files"
on storage.objects for update to authenticated with check (
  bucket_id = 'files'
);

create policy "Users can delete all files"
on storage.objects for delete to authenticated using (
  bucket_id = 'files'
);
