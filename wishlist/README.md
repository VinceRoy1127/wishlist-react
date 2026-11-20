# Wishlistr

Wishlistr organizes gifts directly into folders. Existing wishlist and gift rows are retained in Supabase; the folder migration copies gifts into the new `gifts` table using their former wishlist folder. Gifts from unfiled wishlists remain unfiled. Browser-local data is also retained. Folder owners can delete folders and their gifts, create read-only or sign-in-required edit links, and set each gift's priority from 1 (lowest) to 5 (highest).

## Run locally

```sh
cd wishlist
npm install
npm run dev
```

To use cloud folders and gifts, set `VITE_SUPABASE_URL` to the project base URL (without `/rest/v1`) and `VITE_SUPABASE_ANON_KEY` to the publishable or legacy anon key in `.env.local`. For an existing project that has not yet migrated gifts, run `supabase/migrations/20261119_gifts_in_folders.sql` and then `supabase/migrations/20261119194000_folder_collaboration_and_ranking.sql` in the Supabase SQL Editor. If the gifts migration was already applied, run only the collaboration migration. For a new project, run `supabase/schema.sql` once. The migrations retain legacy wishlist data; the collaboration migration also refreshes the Supabase API schema cache.

## Deploy to Vercel

Set the Vercel project's Root Directory to `wishlist`. In **Project Settings → Environment Variables**, add `VITE_SUPABASE_URL` (your Supabase project URL) and `VITE_SUPABASE_ANON_KEY` (your publishable or legacy anon key) for the environments you deploy, such as Production and Preview. These values are embedded into the frontend at build time, so redeploy after adding or changing them. Do not use a Supabase service-role key in the frontend.

The included `vercel.json` sends app routes such as `/share/<token>` to the client-side router, so shared links work when opened directly.

## Checks

```sh
npm run lint
npm run build
```
