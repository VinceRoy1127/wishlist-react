create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  link text not null check (char_length(link) <= 2048 and link ~* '^https?://'),
  most_wanted boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.gifts (
  id, owner_id, folder_id, title, link, most_wanted, created_at
)
select
  item.id,
  wishlist.owner_id,
  case
    when exists (
      select 1 from public.folders folder
      where folder.id = wishlist.folder_id
        and folder.owner_id = wishlist.owner_id
    ) then wishlist.folder_id
    else null
  end,
  item.title,
  item.link,
  item.most_wanted,
  item.created_at
from public.wishlist_items item
join public.wishlists wishlist on wishlist.id = item.wishlist_id
on conflict (id) do nothing;

create index if not exists gifts_owner_folder_id_idx
  on public.gifts(owner_id, folder_id);

alter table public.gifts enable row level security;

drop policy if exists "Owners manage their gifts" on public.gifts;
create policy "Owners manage their gifts" on public.gifts
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (folder_id is null or exists (
      select 1 from public.folders folder
      where folder.id = folder_id and folder.owner_id = (select auth.uid())
    ))
  );

grant select, insert, update, delete on public.gifts to authenticated;
