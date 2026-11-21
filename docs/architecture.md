# Architecture

## Applications

- `frontend/`: React, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, and shadcn/ui conventions.
- `backend/`: Node.js and Express 5, written in TypeScript. It validates Supabase access tokens, enforces administrator routes, validates requests, and calls the database with the caller's token.
- `supabase/`: ordered PostgreSQL migrations, seed data, Supabase Auth, Storage, Row Level Security, and atomic cart/checkout/payment functions.

The frontend and API are separate applications. Both use the same Supabase project; browser code may only use the project's URL and publishable key. Never put a service-role key in the frontend.

## Team boundaries

| Team | Module | Depends on |
| --- | --- | --- |
| 1 | User management and roles | Supabase Auth |
| 2 | Product catalogue and inventory | User roles for admin writes |
| 3 | Cart, checkout, and simulated payment | Users, products, inventory |
| 4 | Orders and delivery status | Users, checkout, payment |

Cart, order, payment, inventory-history, delivery, notification, review, audit-log, and delivery-staff profile tables are defined in the migrations. Cart mutations, checkout, failed-payment retry, customer order reads, driver assignment, and driver status transitions use authenticated database functions. Delivery invitations and private license uploads/review links use a backend-only service-role client after API role checks; the browser never receives that key. See [PROJECT_PROGRESS.md](../PROJECT_PROGRESS.md) for live database and test status.

Checkout locks cart and inventory rows, stores product/address snapshots, and uses an idempotency key. A failed payment does not decrement stock or clear the cart. Prices are read from PostgreSQL, not accepted from the browser. Tax and shipping are deliberately zero until a project pricing policy is defined.

## Local API contract

`GET /api/health` returns the API status and whether Supabase credentials are configured. This is a configuration check, not a live database connectivity test. Public catalogue reads return active products only; protected profile, address, cart, order, and admin mutations use the verified user's token and remain subject to RLS.
