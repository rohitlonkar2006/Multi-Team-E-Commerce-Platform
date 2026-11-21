# Multi-Team E-Commerce Platform

ShopSphere is a full-stack academic e-commerce project. The backend is a **Node.js application written in TypeScript** (TypeScript is compiled to JavaScript and runs on Node.js). The React frontend is also written in TypeScript.

## Implemented

- `frontend/`: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS, and a shadcn/ui-compatible component setup.
- `backend/`: Node.js + Express + TypeScript, with environment validation, CORS, security headers, API rate limiting, and a health endpoint.
- `backend/`: authenticated profile/address APIs; public catalogue reads; admin-only product, category, inventory, and image operations.
- `frontend/`: registration, sign-in, email verification, password recovery, profile/address management, product catalogue/details, and admin product/category pages.
- Authenticated cart and checkout with server-priced order snapshots, stock validation, idempotent requests, simulated payment outcomes, and order history.
- `supabase/`: ordered PostgreSQL migrations with RLS, profiles, roles, addresses, categories, products, product images, inventory, product availability, and image storage policies.

Cart, checkout, payment, orders, delivery, and analytics remain planned follow-up phases. The health endpoint reports whether Supabase credentials are configured; it does not claim that a database connection has been verified.

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

The storefront checks the API status and retries every 15 seconds.

## Supabase setup

1. Create/use the team's existing Supabase project.
2. In the Supabase SQL Editor, run migrations in timestamp order for a new project:
   - `supabase/migrations/20261121000000_initial_schema.sql`
   - `supabase/migrations/20261121190000_user_product_modules.sql`
   - `supabase/migrations/20261121200000_cart_checkout_orders.sql`
   Then run `supabase/seed.sql` to add starter categories and sample products. Sample inventory values are initialized only when those products are first inserted.
   The configured project already exposes the profile/product/user-product schema, so do not rerun those non-idempotent migrations. Apply only migrations that are not already present; the cart/order migration is currently pending.
3. Copy the project URL and **publishable** key from the Supabase project settings into both local env files:
   - `backend/.env`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   - `frontend/.env.local`: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
4. In Supabase Auth settings, configure the site URL and redirect URL for `http://localhost:5173/account` and `http://localhost:5173/reset-password`.
5. Restart both development servers after changing env files.

The database trigger creates a profile and customer role for new Auth users. No admin is created automatically. Admin roles must be assigned by a trusted project administrator; never allow a user to grant themselves admin access.

To grant the initial admin role, a trusted Supabase project owner can run this in the SQL Editor after the user has registered, replacing the example email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'admin@example.com'
on conflict (user_id, role) do nothing;
```

**Never place a Supabase secret/service-role key in frontend code or commit credentials.** The current backend uses the publishable key plus the verified user's access token so RLS continues to apply; no secret key is required. Only publishable credentials belong in the frontend. `.env` files are ignored by Git and example files contain blank credentials.

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
