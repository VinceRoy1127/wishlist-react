create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.wishlist_collaborators (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role = 'editor'),
  created_at timestamptz not null default now(),
  primary key (wishlist_id, user_id)
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  link text not null check (char_length(link) <= 2048 and link ~* '^https?://'),
  most_wanted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.wishlist_shares (
  token uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.wishlist_editor_invites (
  token uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

create index wishlists_owner_id_idx on public.wishlists(owner_id);
create index wishlists_folder_id_idx on public.wishlists(folder_id);
create index wishlist_items_wishlist_id_idx on public.wishlist_items(wishlist_id);
create index wishlist_collaborators_user_id_idx on public.wishlist_collaborators(user_id);
create unique index wishlist_items_one_most_wanted_idx
  on public.wishlist_items(wishlist_id) where most_wanted;

create function public.can_edit_wishlist(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.wishlists w where w.id = target_id and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.wishlist_collaborators c
    where c.wishlist_id = target_id and c.user_id = auth.uid() and c.role = 'editor'
  );
$$;

revoke all on function public.can_edit_wishlist(uuid) from public;
grant execute on function public.can_edit_wishlist(uuid) to authenticated;

create function public.set_most_wanted(
  target_wishlist_id uuid,
  target_item_id uuid,
  make_most_wanted boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.can_edit_wishlist(target_wishlist_id) then
    raise exception 'You do not have permission to edit this wishlist';
  end if;
  if not exists (
    select 1 from public.wishlist_items
    where id = target_item_id and wishlist_id = target_wishlist_id
  ) then
    raise exception 'Gift not found in this wishlist';
  end if;
  if make_most_wanted then
    update public.wishlist_items
    set most_wanted = false
    where wishlist_id = target_wishlist_id;
  end if;
  update public.wishlist_items
  set most_wanted = make_most_wanted
  where id = target_item_id and wishlist_id = target_wishlist_id;
end;
$$;

alter table public.folders enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_collaborators enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_shares enable row level security;
alter table public.wishlist_editor_invites enable row level security;

create policy "Owners manage their folders" on public.folders
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners and editors read wishlists" on public.wishlists
  for select using (public.can_edit_wishlist(id));
create policy "Users create owned wishlists" on public.wishlists
  for insert with check (
    owner_id = auth.uid()
    and (folder_id is null or exists (
      select 1 from public.folders f where f.id = folder_id and f.owner_id = auth.uid()
    ))
  );
create policy "Owners and editors update wishlists" on public.wishlists
  for update using (public.can_edit_wishlist(id)) with check (
    public.can_edit_wishlist(id)
    and (folder_id is null or exists (
      select 1 from public.folders f
      where f.id = folder_id and f.owner_id = public.wishlists.owner_id
    ))
  );
create policy "Owners delete wishlists" on public.wishlists
  for delete using (owner_id = auth.uid());

create policy "Members can see their collaboration" on public.wishlist_collaborators
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.wishlists w where w.id = wishlist_id and w.owner_id = auth.uid())
  );

create policy "Editors manage wishlist items" on public.wishlist_items
  for all using (public.can_edit_wishlist(wishlist_id))
  with check (public.can_edit_wishlist(wishlist_id));

create policy "Editors manage public share links" on public.wishlist_shares
  for all using (public.can_edit_wishlist(wishlist_id))
  with check (public.can_edit_wishlist(wishlist_id) and created_by = auth.uid());

create function public.create_editor_invite(target_wishlist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_token uuid;
begin
  if auth.uid() is null or not public.can_edit_wishlist(target_wishlist_id) then
    raise exception 'You do not have permission to invite editors to this wishlist';
  end if;
  insert into public.wishlist_editor_invites (wishlist_id, created_by)
  values (target_wishlist_id, auth.uid())
  returning token into new_token;
  return new_token;
end;
$$;

create function public.accept_editor_invite(invite_token uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_wishlist_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting an invitation';
  end if;
  select wishlist_id into target_wishlist_id
  from public.wishlist_editor_invites
  where token = invite_token and expires_at > now()
    and (accepted_at is null or accepted_by = auth.uid());
  if target_wishlist_id is null then
    raise exception 'This invitation is invalid, expired, or already used';
  end if;
  insert into public.wishlist_collaborators (wishlist_id, user_id, role)
  values (target_wishlist_id, auth.uid(), 'editor')
  on conflict (wishlist_id, user_id) do nothing;
  update public.wishlist_editor_invites
  set accepted_at = coalesce(accepted_at, now()), accepted_by = auth.uid()
  where token = invite_token;
end;
$$;

create function public.get_shared_wishlist(share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'link', i.link,
        'most_wanted', i.most_wanted
      ) order by i.created_at)
      from public.wishlist_items i where i.wishlist_id = w.id
    ), '[]'::jsonb)
  )
  from public.wishlist_shares s
  join public.wishlists w on w.id = s.wishlist_id
  where s.token = share_token and s.revoked_at is null;
$$;

revoke all on function public.create_editor_invite(uuid) from public;
revoke all on function public.accept_editor_invite(uuid) from public;
revoke all on function public.get_shared_wishlist(uuid) from public;
revoke all on function public.set_most_wanted(uuid, uuid, boolean) from public;
grant execute on function public.create_editor_invite(uuid) to authenticated;
grant execute on function public.accept_editor_invite(uuid) to authenticated;
grant execute on function public.get_shared_wishlist(uuid) to anon, authenticated;
grant execute on function public.set_most_wanted(uuid, uuid, boolean) to authenticated;

grant select, insert, delete on public.folders to authenticated;
grant update (name) on public.folders to authenticated;
grant select, insert, delete on public.wishlists, public.wishlist_items,
  public.wishlist_shares to authenticated;
grant select on public.wishlist_collaborators to authenticated;
grant update (name, folder_id) on public.wishlists to authenticated;
grant update (title, link, most_wanted) on public.wishlist_items to authenticated;
grant update (revoked_at) on public.wishlist_shares to authenticated;
