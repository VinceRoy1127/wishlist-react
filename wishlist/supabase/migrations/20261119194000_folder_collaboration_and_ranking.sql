alter table public.gifts
  add column if not exists priority integer not null default 3
  check (priority between 1 and 5);

alter table public.gifts drop constraint if exists gifts_folder_id_fkey;
alter table public.gifts
  add constraint gifts_folder_id_fkey
  foreign key (folder_id) references public.folders(id) on delete cascade;

create table if not exists public.folder_collaborators (
  folder_id uuid not null references public.folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);

create table if not exists public.folder_shares (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  access_level text not null check (access_level in ('read', 'edit')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists folder_shares_folder_id_idx
  on public.folder_shares(folder_id);

create or replace function public.is_folder_owner(target_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.folders folder
    where folder.id = target_folder_id and folder.owner_id = auth.uid()
  );
$$;
revoke all on function public.is_folder_owner(uuid) from public;
grant execute on function public.is_folder_owner(uuid) to authenticated;

alter table public.folder_collaborators enable row level security;
alter table public.folder_shares enable row level security;

drop policy if exists "Owners and collaborators read folders" on public.folders;
create policy "Owners and collaborators read folders" on public.folders
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.folder_collaborators collaborator
      where collaborator.folder_id = folders.id and collaborator.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners manage their folders" on public.folders;
drop policy if exists "Owners update their folders" on public.folders;
drop policy if exists "Owners delete their folders" on public.folders;
create policy "Owners manage their folders" on public.folders
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners update their folders" on public.folders
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Owners delete their folders" on public.folders
  for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners manage their gifts" on public.gifts;
drop policy if exists "Owners and editors read gifts" on public.gifts;
drop policy if exists "Owners and editors add gifts" on public.gifts;
drop policy if exists "Owners and editors update gifts" on public.gifts;
drop policy if exists "Owners and editors delete gifts" on public.gifts;
create policy "Owners and editors read gifts" on public.gifts
  for select to authenticated
  using (
    (folder_id is null and owner_id = (select auth.uid()))
    or exists (
      select 1 from public.folders folder
      where folder.id = gifts.folder_id
        and (
          folder.owner_id = (select auth.uid())
          or exists (
            select 1 from public.folder_collaborators collaborator
            where collaborator.folder_id = folder.id
              and collaborator.user_id = (select auth.uid())
          )
        )
    )
  );
create policy "Owners and editors add gifts" on public.gifts
  for insert to authenticated
  with check (
    (folder_id is null and owner_id = (select auth.uid()))
    or exists (
      select 1 from public.folders folder
      where folder.id = gifts.folder_id
        and folder.owner_id = gifts.owner_id
        and (
          folder.owner_id = (select auth.uid())
          or (
            gifts.priority = 3
            and exists (
              select 1 from public.folder_collaborators collaborator
              where collaborator.folder_id = folder.id
                and collaborator.user_id = (select auth.uid())
            )
          )
        )
    )
  );
create policy "Owners and editors update gifts" on public.gifts
  for update to authenticated
  using (
    (folder_id is null and owner_id = (select auth.uid()))
    or exists (
      select 1 from public.folders folder
      where folder.id = gifts.folder_id
        and (
          folder.owner_id = (select auth.uid())
          or exists (
            select 1 from public.folder_collaborators collaborator
            where collaborator.folder_id = folder.id
              and collaborator.user_id = (select auth.uid())
          )
        )
    )
  )
  with check (
    (folder_id is null and owner_id = (select auth.uid()))
    or exists (
      select 1 from public.folders folder
      where folder.id = gifts.folder_id
        and folder.owner_id = gifts.owner_id
        and (
          folder.owner_id = (select auth.uid())
          or exists (
            select 1 from public.folder_collaborators collaborator
            where collaborator.folder_id = folder.id
              and collaborator.user_id = (select auth.uid())
          )
        )
    )
  );
create policy "Owners and editors delete gifts" on public.gifts
  for delete to authenticated
  using (
    (folder_id is null and owner_id = (select auth.uid()))
    or exists (
      select 1 from public.folders folder
      where folder.id = gifts.folder_id
        and (
          folder.owner_id = (select auth.uid())
          or exists (
            select 1 from public.folder_collaborators collaborator
            where collaborator.folder_id = folder.id
              and collaborator.user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "Owners manage folder collaborators" on public.folder_collaborators;
drop policy if exists "Collaborators read their membership" on public.folder_collaborators;
create policy "Owners manage folder collaborators" on public.folder_collaborators
  for all to authenticated
  using (public.is_folder_owner(folder_id))
  with check (public.is_folder_owner(folder_id));
create policy "Collaborators read their membership" on public.folder_collaborators
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Owners manage folder shares" on public.folder_shares;
create policy "Owners manage folder shares" on public.folder_shares
  for all to authenticated
  using (public.is_folder_owner(folder_id))
  with check (
    created_by = (select auth.uid())
    and public.is_folder_owner(folder_id)
  );

create or replace function public.accept_folder_edit_link(share_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_folder_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting an edit link';
  end if;

  select folder_id into target_folder_id
  from public.folder_shares
  where token = share_token
    and access_level = 'edit'
    and revoked_at is null;

  if target_folder_id is null then
    raise exception 'This edit link is invalid or has been revoked';
  end if;

  insert into public.folder_collaborators (folder_id, user_id)
  select target_folder_id, auth.uid()
  where not exists (
    select 1 from public.folders
    where id = target_folder_id and owner_id = auth.uid()
  )
  on conflict (folder_id, user_id) do nothing;

  return target_folder_id;
end;
$$;

create or replace function public.get_shared_folder(share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', folder.id,
    'name', folder.name,
    'access_level', share.access_level,
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', gift.id,
        'title', gift.title,
        'link', gift.link,
        'priority', gift.priority
      ) order by gift.priority desc, gift.created_at)
      from public.gifts gift
      where gift.folder_id = folder.id
    ), '[]'::jsonb)
  )
  from public.folder_shares share
  join public.folders folder on folder.id = share.folder_id
  where share.token = share_token and share.revoked_at is null;
$$;

create or replace function public.list_folder_collaborators(target_folder_id uuid)
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select collaborator.user_id, account.email::text
  from public.folder_collaborators collaborator
  join auth.users account on account.id = collaborator.user_id
  join public.folders folder on folder.id = collaborator.folder_id
  where folder.id = target_folder_id and folder.owner_id = auth.uid();
$$;

create or replace function public.set_gift_priority(target_gift_id uuid, new_priority integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new_priority < 1 or new_priority > 5 then
    raise exception 'Priority must be between 1 and 5';
  end if;

  update public.gifts gift
  set priority = new_priority
  where gift.id = target_gift_id
    and (
      (gift.folder_id is null and gift.owner_id = auth.uid())
      or exists (
        select 1 from public.folders folder
        where folder.id = gift.folder_id and folder.owner_id = auth.uid()
      )
    );

  if not found then
    raise exception 'Gift not found or you do not own it';
  end if;
end;
$$;

revoke all on function public.accept_folder_edit_link(uuid) from public;
revoke all on function public.is_folder_owner(uuid) from public;
revoke all on function public.get_shared_folder(uuid) from public;
revoke all on function public.list_folder_collaborators(uuid) from public;
revoke all on function public.set_gift_priority(uuid, integer) from public;
grant execute on function public.accept_folder_edit_link(uuid) to authenticated;
grant execute on function public.is_folder_owner(uuid) to authenticated;
grant execute on function public.get_shared_folder(uuid) to anon, authenticated;
grant execute on function public.list_folder_collaborators(uuid) to authenticated;
grant execute on function public.set_gift_priority(uuid, integer) to authenticated;

revoke update on public.gifts from authenticated;
grant select, insert, delete on public.folders to authenticated;
revoke update on public.folders from authenticated;
grant update (name) on public.folders to authenticated;
grant update (title, link, most_wanted) on public.gifts to authenticated;
grant select, insert, delete on public.folder_collaborators to authenticated;
grant select, insert, update, delete on public.folder_shares to authenticated;
grant select, insert, delete on public.gifts to authenticated;

notify pgrst, 'reload schema';
