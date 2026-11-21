# Agile plan

## Product backlog

| Priority | User story | Acceptance criteria |
| --- | --- | --- |
| P0 | As a customer, I can register, verify my email and sign in so my account is private. | Supabase Auth is used; invalid credentials show an error; protected routes require a valid session. |
| P0 | As a customer, I can manage my profile and saved addresses. | A customer can create, edit, select a default, and delete only their own addresses. |
| P0 | As a shopper, I can search and filter the catalogue. | Results come from Supabase; search, category, price, sorting, and pagination inputs are validated. |
| P0 | As an administrator, I can manage products, categories, images, and stock. | Admin-only APIs and RLS protect writes; invalid prices and negative stock are rejected. |
| P1 | As a customer, I can put products in a persistent cart and check out. | The server revalidates prices and inventory and prevents duplicate submission. |
| P1 | As a customer, I can complete a clearly simulated payment. | Success/failure is persisted; a failed payment is never marked paid. |
| P1 | As a customer, I can see my order and delivery status. | Orders are customer-scoped and status changes are visible after refresh. |
| P2 | As an administrator, I can review operational metrics and export reports. | Metrics use persisted records; export filters match the displayed data. |

## Four two-week sprints

| Sprint | Goal | Planned work |
| --- | --- | --- |
| 1 | Foundation and identity | React/Express workspace, Supabase schema, authentication, roles, profiles, addresses, initial product catalogue |
| 2 | Product and shopping | Product CRUD, categories, storage images, inventory, cart persistence, checkout |
| 3 | Payment and fulfilment | Labelled payment simulation, order creation, order history, delivery status and hand-offs |
| 4 | Quality and jury readiness | Integration and browser tests, defect fixes, sample data, documentation, deployment/demo rehearsal |

## Definition of Done

- Acceptance criteria are met and the UI has loading, empty, validation, and error states.
- API inputs are schema-validated and protected data is authorized on both the server and with RLS.
- Tests cover relevant success, failure, and boundary cases; test results and defects are recorded.
- `npm test`, `npm run lint`, and `npm run build` pass from the repository root.
- API contracts and setup documentation match the implemented behavior.
- Simulated external services are clearly labelled; no secrets are committed.

## Suggested board structure and communication

Use Jira/Trello columns: Backlog → Ready → In Progress → Review → Testing → Done. Each card includes an owner, user story, acceptance criteria, dependency, and test evidence. Teams hold a short daily sync, a weekly integration sync, and sprint planning/review/retrospective at each two-week boundary. Update the board and GitHub pull request links when work changes state.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Supabase project/key unavailable | Keep local startup explicit; report missing configuration, never fake persistence. |
| Cross-team schema/API drift | Review shared contracts and migration changes at the integration sync. |
| Stock changes during checkout | Reserve/revalidate stock transactionally in the checkout phase. |
| Simulated payment mistaken for a live gateway | Label all simulation UI and demonstration steps. |
| Uneven contribution evidence | Link each student's stories, commits, reviews, and test work to the board. |
