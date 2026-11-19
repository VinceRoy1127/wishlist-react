# Wishlistr

Wishlistr is a React app for creating gift wishlists. Without backend credentials, it runs in local mode and saves folders and lists in this browser. Supabase adds accounts, cloud storage, read-only sharing links, and editor invitations.

## Run locally

```sh
cd wishlist
npm install
npm run dev
```

## Enable accounts and sharing with Supabase

Supabase is the recommended free backend for this app because one project includes hosted Postgres and email/password authentication. Its current Free plan includes 50,000 monthly active users and 500 MB of database storage; free projects may pause after one week of inactivity and the plan currently allows two active projects. Check the [Supabase pricing page](https://supabase.com/pricing) for current limits.

1. Create a free account and project at [supabase.com/dashboard](https://supabase.com/dashboard). Save the project URL and its publishable (or legacy anon) key from **Connect** / **API Keys**.
2. In the Supabase SQL Editor, run the complete [`supabase/schema.sql`](./supabase/schema.sql) script. It creates the tables, row-level security policies, and safe RPC functions used for public share links and editor invites.
   If the project already has the schema installed, run [`supabase/migrations/20261119_wishlist_insert_rls.sql`](./supabase/migrations/20261119_wishlist_insert_rls.sql) in the SQL Editor to update the wishlist insert policy and make ownership default to the signed-in user.
3. Copy `.env.example` to `.env.local` and replace the example values:

   ```sh
   cp .env.example .env.local
   ```

   Set `VITE_SUPABASE_URL` to your project URL and `VITE_SUPABASE_ANON_KEY` to its publishable/anon key. Restart the Vite server after changing environment variables.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your local app URL (normally `http://localhost:5173`) and add `http://localhost:5173/**` to the allowed redirect URLs. Enable the Email provider. Keep email confirmation enabled or configure it to match your needs.
5. Sign up through the app’s **Account** link. After email confirmation, sign in, create folders and wishlists, and use **Create read-only link** or **Invite editor** on a wishlist.

The browser uses only the project URL and publishable/anon key. Never put a `service_role` or secret key in this app or in a `VITE_` variable. The schema enables row-level security on every table; public readers receive wishlist data only through the unguessable share token and the `get_shared_wishlist` function. Active public links can be revoked from the wishlist. Editor invitation links expire after seven days, grant editor access to whoever uses the link, and require that person to sign in; share invite links only with the intended collaborator.

The first logged-in user starts with an empty cloud workspace. Existing local wishlist data remains in this browser and is not automatically uploaded to an account.
When deploying the SPA, configure the host to serve `index.html` for `/share/*` and `/invite/*` routes so direct share and invite links load.

## Checks

```sh
npm run lint
npm run build
```
