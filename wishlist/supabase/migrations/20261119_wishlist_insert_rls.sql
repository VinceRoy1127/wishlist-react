alter table public.wishlists
  alter column owner_id set default auth.uid();

drop policy if exists "Owners and editors read wishlists" on public.wishlists;
create policy "Owners and editors read wishlists" on public.wishlists
  for select to authenticated
  using (public.can_edit_wishlist(id));

drop policy if exists "Users create owned wishlists" on public.wishlists;
create policy "Users create owned wishlists" on public.wishlists
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and (folder_id is null or exists (
      select 1 from public.folders f
      where f.id = folder_id and f.owner_id = (select auth.uid())
    ))
  );
