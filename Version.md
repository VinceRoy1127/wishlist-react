# Version history

## V 1.1

- Set up the Wishlistr React/Vite app with page routing, a header, and a footer.
- Added the gift form and wishlist cards, including links, a “most wanted” marker, and remove controls.
- Added wishlist browser storage, visual styling, and Vercel Analytics.

## V 2

- Added folders to organize multiple wishlists and added wishlist selection when adding gifts.
- Added Supabase email/password accounts and cloud-backed wishlist storage, with local browser storage available before backend setup.
- Added read-only wishlist share links with active-link management and revocation, plus seven-day editor invitation links for signed-in collaborators.
- Prevented duplicate sign-up submissions and clarified recovery when an email may already have an account.
- Added Supabase schema, row-level security policies, and setup instructions in `wishlist/README.md`.
- Recommended Supabase’s Free plan and documented the required project URL and publishable/anon key.

## 2.1

- Added dedicated folder pages where owners and editors can add, edit, and remove gifts.
- Added folder deletion with cascading removal of its gifts.
- Added read-only share links and sign-in-required edit links, with owner controls to revoke links and remove collaborators.
- Added owner-managed gift priorities from 1 (lowest) to 5 (highest), sorted by priority.
- Added the folder collaboration and ranking migration, including RLS policies and schema-cache refresh.

## 2.1.1

- Fixed collaboration links (vercel.json)
- Fixed the title of the web app.