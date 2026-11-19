# Wishlistr

Wishlistr organizes gifts directly into folders. Existing wishlist and gift rows are retained in Supabase; the folder migration copies gifts into the new `gifts` table using their former wishlist folder. Gifts from unfiled wishlists remain unfiled. Browser-local data is also retained. Folder owners can delete folders and their gifts, create read-only or sign-in-required edit links, and set each gift's priority from 1 (lowest) to 5 (highest).

## Run locally

```sh
cd wishlist
npm install
npm run dev
```

To use cloud folders and gifts, set `VITE_SUPABASE_URL` to the project base URL (without `/rest/v1`) and `VITE_SUPABASE_ANON_KEY` to the publishable or legacy anon key in `.env.local`. For an existing project that has not yet migrated gifts, run `supabase/migrations/20261119_gifts_in_folders.sql` and then `supabase/migrations/20261119194000_folder_collaboration_and_ranking.sql` in the Supabase SQL Editor. If the gifts migration was already applied, run only the collaboration migration. For a new project, run `supabase/schema.sql` once. The migrations retain legacy wishlist data; the collaboration migration also refreshes the Supabase API schema cache.

## Checks

```sh
npm run lint
npm run build
```
