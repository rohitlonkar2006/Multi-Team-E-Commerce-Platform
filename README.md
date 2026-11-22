# Multi-Team E-Commerce Platform

ShopSphere is a full-stack academic e-commerce project. The backend is a **Node.js application written in TypeScript** (TypeScript is compiled to JavaScript and runs on Node.js). The React frontend is also written in TypeScript.

## Implemented

- `frontend/`: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS, and a shadcn/ui-compatible component setup.
- `backend/`: Node.js + Express + TypeScript, with environment validation, CORS, security headers, API rate limiting, and a health endpoint.
- `backend/`: authenticated profile/address APIs; public catalogue reads; admin-only product, category, inventory, and image operations.
- `frontend/`: registration, sign-in, email verification, password recovery, profile/address management, product catalogue/details, and admin product/category pages.
- Dedicated role-checked administrator (`/admin/login`) and staff (`/staff/login`) sign-in screens.
- Authenticated cart and checkout with server-priced order snapshots, stock validation, idempotent requests, simulated payment outcomes, and order history.
- Separate customer, administrator, and delivery-partner dashboards. Administrators invite delivery accounts and review private license uploads; approved partners see and update only their assigned deliveries.
- `supabase/`: ordered PostgreSQL migrations with RLS, profiles, roles, addresses, catalogue and inventory, checkout, private delivery-license storage, service zones, assignment, and status history.

Delivery assignment uses an administrator-managed service zone matching the order city or postcode; the application does not collect continuous driver GPS. The health endpoint reports whether Supabase credentials are configured; it does not claim that a database connection has been verified.

## Requirements

- Node.js 20.19+ (Node.js 22+ recommended)
- npm
- A Supabase project for database-backed features

## Run locally

From the repository root:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
npm run dev
```

This starts both applications. The API listens at `http://localhost:4000` and the frontend normally runs at `http://localhost:5173`. Check `http://localhost:4000/api/health` to see API status.

You can also run either app separately:

```powershell
npm run dev:api
npm run dev:web
```

The storefront checks API status when it loads and avoids continuous health polling.

## Vercel deployment

Deploy `frontend/` and `backend/` as separate Vercel projects. The frontend Vercel rewrite proxies `/api/*` to `https://shopsphere-api.vercel.app/api/*`; update that destination if the backend project uses a different domain. The backend's `api/[...route].ts` exposes the Express API as a serverless function.

Set these variables in the corresponding Vercel project settings before deploying:

- Backend: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_URL` (the deployed frontend URL, including `https://`).
- Frontend: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Keep the service-role key backend-only. Do not upload local `.env` files or commit credentials. Add the deployed frontend URL and its `/account` and `/reset-password` routes to the Supabase Auth URL configuration.

## Supabase setup

1. Create/use the team's existing Supabase project.
2. In the Supabase SQL Editor, run migrations in timestamp order for a new project:
   - `supabase/migrations/20261121000000_initial_schema.sql`
   - `supabase/migrations/20261121190000_user_product_modules.sql`
   - `supabase/migrations/20261121200000_cart_checkout_orders.sql`
   - `supabase/migrations/20261122000000_delivery_operations.sql`
   - `supabase/migrations/20261123000000_admin_operations.sql` (run after creating the admin Auth user below)
   - `supabase/migrations/20261123100000_fix_admin_dashboard_analytics.sql`
   - `supabase/migrations/20261124110000_correct_seeded_product_images.sql`
   - `supabase/migrations/20261124120000_enable_staff_workspaces.sql`
   - `supabase/migrations/20261124130000_backfill_delivery_staff_profiles.sql`
   - `supabase/migrations/20261124140000_admin_product_delete.sql`
   - `supabase/migrations/20261124150000_category_images.sql`
   - `supabase/migrations/20261124160000_fix_canvas_market_tote_image.sql` (run last)
   After the initial and user/product schema migrations are present, run `supabase/seed.sql` to add 10 categories and 100 image-backed sample products. Sample inventory is set only for newly inserted products; rerunning the seed does not restock existing products.
   The configured project already exposes the profile/product/user-product schema, so do not rerun those non-idempotent migrations. The cart/order migration can be rerun after a partial application; apply the delivery migration after it and verify its tables/functions in Supabase.
3. Copy the project URL and **publishable** key from the Supabase project settings into both local env files:
   - `backend/.env`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   - `frontend/.env.local`: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
4. In Supabase Auth settings, configure the site URL and redirect URL for `http://localhost:5173/account` and `http://localhost:5173/reset-password` (delivery-partner invitations use the password setup route).
5. Restart both development servers after changing env files.

The database trigger creates a profile and customer role for new Auth users. No admin is created automatically. Admin roles must be assigned by a trusted project administrator; never allow a user to grant themselves admin access.

To create the requested initial admin, configure the backend `.env` with the Supabase URL and service-role key, then run this from an interactive terminal:

```powershell
npm run admin:provision --workspace=backend
```

The provisioner creates or updates `lonkarravi00@gmail.com`, grants the admin role, and prompts twice for the password without echoing it. If the previous `lonkarrohit77@gmail.com` account exists, it updates that account's email and password. It refuses to print or store the password. Alternatively, create or update the Auth user in the Supabase dashboard first, then run `supabase/migrations/20261123000000_admin_operations.sql`; the migration grants the admin role to that existing email and fails clearly if no matching Auth user exists.

If you need to grant the role separately, a trusted project owner can run:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('lonkarravi00@gmail.com')
on conflict (user_id, role) do nothing;
```

Sign in at `/admin/login`. Do not put the password in source code, SQL, or committed documentation. The admin dashboard includes recent order status management, customer/staff role views, links to the existing inventory tools, and CSV sales reports.

**Never place a Supabase secret/service-role key in frontend code or commit credentials.** Delivery account invitations and private license-file operations require `SUPABASE_SERVICE_ROLE_KEY` in the backend only. Normal database operations use the publishable key plus the verified user's access token, and role-checked database functions enforce delivery assignment and status changes. Only publishable credentials belong in the frontend. `.env` files are ignored by Git and example files contain blank credentials.

The checkout demonstration provides explicit simulated success/failure outcomes and cash on delivery. It is not a real bank, card, or UPI integration. Tax and shipping are zero until the project defines a pricing policy.

## Checks

```powershell
npm test
npm run lint
npm run build
```

## Project layout

```text
frontend/       React application
backend/        Express API
supabase/       SQL migrations and seed data
docs/           Architecture, API contracts, team ownership, and Agile plan
project-info/   Course-provided jury documents (kept out of Git)
```

See [docs/architecture.md](./docs/architecture.md) for module ownership and dependencies.
See [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md) for verified implementation status and remaining work.
