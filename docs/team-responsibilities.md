# Team responsibilities and hand-offs

All teams use one Supabase project, shared UUID identifiers, published API contracts, and the same status/validation conventions.

| Team | Ownership | Provides | Depends on |
| --- | --- | --- | --- |
| 1 — User Management | Supabase Auth, profiles, roles, addresses, protected routes | Verified user identity and role | Supabase Auth |
| 2 — Product Management | Categories, catalogue CRUD, images, inventory | Active products, prices, availability | Team 1 for administrator writes |
| 3 — Cart and Payment | Persistent cart, checkout, simulated payment | Validated checkout result and payment status | Teams 1 and 2 |
| 4 — Order and Delivery | Orders, status history, delivery assignment/tracking | Order lifecycle updates visible to customers | Teams 1 and 3 |

## Integration rules

- Team 1 owns identity and access policy. Other teams consume the verified Supabase user ID; they do not create local user IDs or trust client-supplied roles.
- Team 2 owns catalogue prices and inventory. Checkout must re-read both on the server and must not trust a browser-supplied total.
- Team 3 owns the cart/payment hand-off. A simulated payment must remain visibly labelled and a failed result cannot become paid.
- Team 4 owns order and delivery status transitions. Delivery state changes must be persisted and visible in customer order tracking.
- Cross-team API changes update `api-contracts.md` and the relevant tests before dependent implementation changes.

## Current ownership status

- Team 1: authentication UI, verified API sessions, profile/address APIs, role-aware dashboards, and RLS.
- Team 2: catalogue browsing, admin product/category CRUD, image upload and stock management.
- Team 3: cart, checkout, and simulated payment implementation remains to be verified end-to-end against live Supabase.
- Team 4: delivery partner provisioning, license review, zone-matched assignment, scoped delivery status updates, and tracking UI are implemented in code; notification UI and live migration verification remain.
