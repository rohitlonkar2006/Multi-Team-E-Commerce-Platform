# API contracts

Base URL: `http://localhost:4000/api`

Authenticated routes require `Authorization: Bearer <Supabase access token>`. Tokens are verified with Supabase Auth. Admin routes additionally check the caller's `user_roles` record and are subject to database RLS.

## Responses and errors

Successful JSON responses use named resource properties or paginated results. Errors use:

```json
{ "error": "Readable explanation", "details": {} }
```

`details` is included for validation failures. Common statuses are `400` invalid input, `401` missing/invalid session, `403` insufficient role, `404` missing record, `409` unique conflict, and `503` missing Supabase configuration. Database internals and credentials are not returned.

## User management

Supabase Auth client methods handle registration, login, logout, email confirmation, and password recovery. New accounts receive a customer role and profile from the Auth database trigger.

| Method | Route | Access | Contract |
| --- | --- | --- | --- |
| GET | `/auth/me` | Customer | Returns `{ user, profile, roles }` for the verified token |
| PATCH | `/users/profile` | Customer | `{ fullName, avatarUrl? }` updates only the current profile |
| GET | `/users/addresses` | Customer | Returns only the caller's addresses |
| POST | `/users/addresses` | Customer | Creates an address owned by the caller |
| PATCH | `/users/addresses/:id` | Owner | Updates an owned address |
| PATCH | `/users/addresses/:id/default` | Owner | Atomically selects the default address |
| DELETE | `/users/addresses/:id` | Owner | Deletes an owned address |

## Product catalogue

`GET /products` accepts `q`, `categoryId`, `minPrice`, `maxPrice`, `sort`, `page`, and `pageSize` (maximum 50). Sort values: `newest`, `price_asc`, `price_desc`, `name_asc`. It returns `{ products, page, pageSize, total }`. Each public product includes an `in_stock` boolean, not the exact inventory count. `GET /products/:slug` also includes its permitted image gallery.

| Method | Route | Access | Contract |
| --- | --- | --- | --- |
| GET | `/products/:slug` | Public | Returns `{ product }` for an active product |
| GET | `/categories` | Public | Returns active categories |
| GET | `/admin/products` | Admin | Returns all products and inventory quantities |
| POST | `/admin/products` | Admin | Creates a product; accepts `sku`, `name`, `slug?`, `description`, `categoryId`, `price`, `currency`, `isActive`, `quantity` |
| PUT | `/admin/products/:id` | Admin | Updates supplied product fields |
| DELETE | `/admin/products/:id` | Admin | Deactivates a product rather than erasing its history |
| PATCH | `/admin/products/:id/inventory` | Admin | `{ quantity }` sets a non-negative stock count |
| POST | `/admin/products/:id/image` | Admin | Multipart `image` upload: JPEG, PNG, or WebP up to 5 MB |
| GET | `/admin/categories` | Admin | Returns active and inactive categories |
| POST | `/admin/categories` | Admin | Creates a category |
| PUT | `/admin/categories/:id` | Admin | Updates a category |
| DELETE | `/admin/categories/:id` | Admin | Deactivates a category |
| GET | `/admin/analytics` | Admin or super-admin | Returns database-backed store totals, recent orders, and revenue/order trends |

The API uses the Supabase publishable key and caller's access token for normal database requests. Delivery mutations use role-checked database functions; only invitation and private-file operations use the backend-only service-role key.

## Cart, checkout, orders, and simulated payments

All routes in this section require a verified Supabase access token. The frontend submits only product IDs and quantities; checkout prices and stock are re-read and locked in PostgreSQL. `POST /orders` requires a JSON `idempotencyKey`. Tax and shipping are currently zero because no business pricing policy has been supplied.

| Method | Route | Access | Contract |
| --- | --- | --- | --- |
| GET | `/cart` | Customer | Returns `{ cart: { items, subtotal } }` for the caller |
| POST | `/cart/items` | Customer | `{ productId, quantity }`; quantity is 1–99 and stock is checked |
| PATCH | `/cart/items/:id` | Owner | `{ quantity }`; quantity and current stock are checked |
| DELETE | `/cart/items/:id` | Owner | Removes an owned cart item |
| POST | `/orders` | Customer | `{ addressId, paymentMethod, simulatedResult, idempotencyKey }`; creates order/payment atomically |
| GET | `/orders` | Customer | Returns only the caller's orders, line snapshots, payment attempts, and delivery summary |
| GET | `/orders/:id` | Owner or order manager | Returns order details; unauthorized customer orders are not disclosed |
| POST | `/payments/simulate` | Customer | `{ orderId, simulatedResult, idempotencyKey }`; retries only a failed simulated payment |
| GET | `/payments/:id` | Owner or order manager | Returns only the caller's payment record |

Payment methods are `simulated_upi`, `simulated_card`, and `cash_on_delivery`. Simulation outcomes are `success` or `failed`; cash on delivery is recorded as pending. Simulations do not connect to a bank or collect payment credentials. Failed payments preserve cart contents and do not decrement inventory. Successful simulated payments and COD checkout decrement stock and write inventory history in the same PostgreSQL transaction. Retrying a failed payment rechecks stock under row locks.

## Delivery accounts and dispatch

Customer registration always creates a customer role. Delivery accounts are created only by administrators, who send an email invitation and assign a city or postcode service zone. A delivery partner submits a JPEG, PNG, or PDF license (up to 5 MB); it is kept in a private bucket and requires administrator approval before the partner can receive or view assigned deliveries. Review links expire after 60 seconds. No GPS coordinates are collected.

Administrators assign orders to active, license-approved partners whose configured zone exactly matches the order city or postcode. Delivery partners can access only their own assignments and can advance them through the permitted delivery status sequence. Delivery managers may assign orders but cannot create accounts or review licenses.

| Method | Route | Access | Contract |
| --- | --- | --- | --- |
| POST | `/admin/delivery/staff` | Admin | `{ fullName, email, serviceZone }` sends a delivery-partner invitation |
| GET | `/admin/delivery/staff` | Admin | Lists delivery accounts and license-review state |
| PATCH | `/admin/delivery/staff/:staffId` | Admin | `{ serviceZone, isActive }` updates a partner's service zone or active state |
| GET | `/admin/delivery/staff/:staffId/license-url` | Admin | Returns a 60-second signed URL for a pending private license |
| POST | `/admin/delivery/staff/:staffId/license-review` | Admin | `{ decision: "approved" }` or `{ decision: "rejected", rejectionReason }` |
| GET | `/admin/delivery/orders` | Admin or delivery manager | Lists non-terminal orders with their delivery zone and current assignment |
| PUT | `/admin/delivery/orders/:orderId/assign` | Admin or delivery manager | `{ deliveryStaffId }`; database rechecks license, active status, order state, and zone |
| GET | `/delivery/manager/staff` | Admin or delivery manager | Lists only active, license-approved partners eligible for assignment |
| GET | `/delivery/dashboard` | Delivery partner | Returns their license state and only orders assigned to their account |
| POST | `/delivery/license` | Delivery partner | Multipart `license` upload; JPEG, PNG, or PDF up to 5 MB |
| PATCH | `/delivery/orders/:deliveryId/status` | Assigned delivery partner | `{ status, note? }` advances only that partner's assigned delivery |
