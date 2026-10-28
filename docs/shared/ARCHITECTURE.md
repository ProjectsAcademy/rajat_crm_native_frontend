# Architecture

## System picture

```
  Android APK / iOS build / Web (Expo, rajat_crm_native_frontend)
        |  HTTPS JSON, Authorization: Bearer <JWT>
        v
  Cloudflare (DNS + TLS, "Flexible" mode for urjaradiant.com)
        |  plain HTTP
        v
  Oracle Cloud VM -> nginx -> pm2 process
        dev:  dev-crm-backend  (port 3001, branch dev_01)
        prod: crm-backend      (port 3000, branch main)
        |  Express app (rajat_crm_node_backend)
        |-- Prisma (ONE shared client) --> Supabase PostgreSQL (session/transaction pooler)
        |-- MinIO S3 client -----------> object storage (attachments, images)
        |-- Playwright (Chromium) -----> server-side invoice / statement PDFs (WhatsApp only)
        '-- fetch --------------------> Meta WhatsApp Cloud API (optional)

  Meta WhatsApp Cloud API --(webhook, signed)--> POST /api/whatsapp/webhook
        (customer messages to the business number → self-service menu bot)
```

## Request lifecycle (backend)

1. `src/server.ts` loads `.env`, starts `src/app.ts` on `HOST`/`PORT`.
2. Global middleware: `helmet`, `cors({ origin: '*' })`, `morgan('dev')`,
   JSON and urlencoded body parsers.
3. Route group mounted at `/api/<module>`. Almost every router starts with
   `router.use(requireAuth, requirePermission('<feature-key>'))`.
4. `requireAuth` (`src/middleware/auth.ts`) verifies the JWT
   (`JWT_SECRET`, default lifetime `JWT_EXPIRES_IN=7d`) and sets
   `req.user = { id, username, email, isStaff, isSuperuser }`.
5. `requirePermission(key)` (`src/middleware/permissions.ts`) checks the
   user's effective access, read from the database (cached 60 s per user).
6. Handler uses the shared Prisma client and returns JSON. Errors return
   `{ "error": "message" }` with 400/401/403/404/500.

Public endpoints: `GET /api/health`, `POST /api/auth/login`.

## Authentication

- Login: `POST /api/auth/login` with username + password. Passwords are
  verified in Django PBKDF2-SHA256 format (`pbkdf2_sha256$iter$salt$hash`),
  inherited from the old Django system.
- The JWT is stored on the device under the key `auth_token`
  (web: `localStorage`; native: `expo-secure-store`).
- On app start the frontend calls `GET /api/auth/me`, which returns the user
  plus `permissions` (the effective feature keys). Permissions are never put
  inside the JWT (size limit of secure store + they would go stale for 7 days).

## Permissions (RBAC)

- Feature catalog: `rajat_crm_node_backend/src/lib/features.ts` — one key per
  module (`orders`, `customers`, `ledger`, `revenue`, ...), HR sub-keys
  (`hr.attendance`, ...; granting `hr` grants all of them), and three
  independent calendar tiers (`calendar`, `calendar-write`, `calendar-manage`).
- Users belong to **groups**; groups hold feature keys
  (tables `groups`, `user_groups`, `group_permissions`). Managed in the app at
  Admin → Users / Groups (super admin only, `/api/admin/*`).
- Decision order in `requirePermission`:
  1. inactive user → 401
  2. `is_superuser` → allowed
  3. `is_legacy_access` and `RBAC_STRICT` is not `true` → allowed
  4. a granted key covers the requested key → allowed
  5. otherwise: if `RBAC_ENFORCE` is not `true` → allowed but logged as
     `[rbac-shadow] deny ...` (shadow mode); if `true` → 403.
- Errors inside the RBAC check fail open (logged) so a bug there cannot take
  down working features.
- Frontend: `userHasFeature(user, key)` hides UI; `useFeatureGuard(key)` in each
  module `_layout.tsx` redirects to Home. UI hiding is convenience; the
  backend check is the real gate.
- Rollout status of the two flags: see KNOWN_ISSUES_AND_PENDING.md.

## Data model (PostgreSQL via Prisma)

Schema: `rajat_crm_node_backend/prisma/schema.prisma`. Tables use snake_case
(`@@map`), Prisma fields use camelCase. Money columns are `Decimal(15,2)`;
calendar dates are `@db.Date`.

| Area | Models |
|---|---|
| Users & RBAC | `User`, `Group`, `UserGroup`, `GroupPermission` |
| Parties | `Customer` (with ledger opening balance), `Vendor`, `Employee` |
| Work | `Tender` → `Project`; `MaintenancePeriod` → `FdAlert`; `ProjectPhotograph`; `Vehicle` → `VehicleUsage`; `CalendarEvent` |
| Inventory | `Inventory` (item master), `Stock` (movement ledger: in/out/adjustment) |
| Sales | `Order` → `OrderItem`, `OrderPayment`, `OrderVendorWork`, `OrderMedia`; `Estimate` → `EstimateItem`; `Invoice` → `InvoiceItem`, `InvoiceMedia` |
| Customer ledger | `CustomerReceipt` (lump-sum payment), `CustomerLedgerEntry` (discount / write-off / charge / refund) |
| Purchases & tax | `Purchase` → `PurchaseItem` (adds stock), `GstRecord` |
| HR & payroll | `EmployeeAttendance`, `SalaryComponent`, `SalaryPayment`, `SalaryIncentive`, `EpfEsic` |
| Media | `TenderMedia`, `InvoiceMedia`, `InventoryMedia`, `OrderMedia` (files live in MinIO) |
| WhatsApp | `WhatsappMessage` (log of every message in/out), `PaymentReminder` (automatic reminder setting per customer) |

Key relations:

- An **Order** has an optional customer and project, items, payments, vendor
  works, attachments, and can have invoices (`invoices.order_id`) and
  estimates (`estimates.order_id`).
- An **OrderPayment** can belong to a **CustomerReceipt** (`receipt_id`);
  then it is one slice of a lump-sum payment.
- An **Invoice** is `sales` (customer) or `purchase` (vendor) and may point to
  the order it was made from.

## Money flow (how the numbers relate)

```
Order.totalAmount  = sum(item qty × unit price × rental days)
Order.paidAmount   = sum(order_payments.amount for that order)   <- derived, recalcOrderPaid()
Order.paymentStatus = paid | partial | pending                   <- derived

Customer ledger balance =
    opening balance
  + sum(non-cancelled order totals)
  + charges + refunds                (ledger entries, Dr)
  - sum(direct order payments)       (payments with no receipt)
  - sum(receipt amounts)             (full receipt amount; its slices are not counted again)
  - discounts + write-offs           (ledger entries, Cr)
  positive = customer owes (Dr), negative = advance (Cr)
```

- The ledger is **computed on every request** (`src/lib/ledger.ts`), not
  stored, so it cannot drift from orders/payments.
- Invoices are documents for the customer; they do not affect the ledger or
  the order's paid amount.
- The dashboard "Outstanding" figure is simpler (order totals − paid
  amounts), so it can differ from the ledger when adjustments, opening
  balances, advances or cancelled orders exist.

## Document numbers

| Document | Format | Generated in |
|---|---|---|
| Order | `ORD-OCT26-0001` (month + 2-digit year + sequence) | `routes/orders.ts` `nextOrderNo` |
| Invoice | `INV-OCT26-0001` | `routes/invoices.ts` `nextInvoiceNo` and `routes/orders.ts` `nextInvoiceNoTx` (duplicate, keep in sync) |
| Estimate | `EST-OCT26-0001` | `routes/estimates.ts` |
| Receipt | `RCT-OCT26-0001` | `routes/ledger.ts` |
| Purchase | `PUR-OCT26-001` | `routes/purchases.ts` (still `count()+1`, see KNOWN_ISSUES) |
| Customer / Vendor / Employee code | `CUST001` / `VEND001` / `EMP001` when left blank | respective routes |

## Files, PDFs and messages

- **Attachments**: `POST /api/media/upload` (multipart) → images compressed
  with `sharp` (max 1920 px, JPEG 80) → stored in MinIO under
  `<folder>/<document number>/<timestamp>-<name>` → row in the `*_media`
  table. Viewing uses presigned URLs (`GET /api/media/presign/...`). The
  frontend uploads with raw `XMLHttpRequest`, never axios (axios' JSON header
  breaks multer).
- **Invoice print / PDF**: built in the frontend from
  `utils/invoiceHtml.ts`; web opens it in a blob tab and prints, native uses
  `expo-print` + share sheet. Customer statements use `utils/ledgerHtml.ts`
  the same way.
- **WhatsApp invoice**: `POST /api/invoices/:id/send-whatsapp` renders the
  PDF on the server (`src/utils/invoicePdf.ts`, Playwright Chromium), uploads
  it to Meta's WhatsApp Cloud API and sends the approved template
  `invoice_share`. Needs `WHATSAPP_*` env vars and Meta Business setup.
- **WhatsApp templates to customers** (order confirmation, payment received,
  payment reminder and account statement with the statement PDF):
  `src/lib/customerMessages.ts`, called from buttons in the order and ledger
  screens; automatic payment reminders run in `src/lib/paymentReminders.ts`
  on the one server with `WHATSAPP_REMINDERS_ENABLED=true`.
- **WhatsApp bot**: customers who message the business number get a list
  menu (pending amount, latest orders, my invoices → invoice PDF, payment
  history, statement PDF). Meta calls
  `POST /api/whatsapp/webhook` (signature-checked); `src/lib/whatsappBot.ts`
  answers inside the free 24-hour window. Statement PDFs come from
  `src/utils/statementPdf.ts` (server copy of the app's statement layout).
- **PDF rendering is serialised** (`renderHtmlToPdf`, one Chromium at a time)
  because the server has ~1 GB RAM.

## Frontend structure (summary)

- Expo Router file-based routes under `app/`. `(auth)/login`, and `(app)/`
  with five visible tabs plus hidden module stacks (`href: null`), each with
  `_layout.tsx` (Stack + feature guard), `index.tsx` (list) and `[id].tsx`
  (detail).
- `services/api.ts` holds the axios instance (adds the Bearer token) and one
  typed API object per module (`ordersApi`, `ledgerApi`, ...).
- `store/auth.ts` (Zustand) holds the user and token; `isInitialized` gates
  the first render.
- Form sheets in `components/*FormSheet.tsx` handle create/edit.
- Web gets a top navigation bar (`WebTopNav`) and desktop layouts; native gets
  a bottom tab bar.

Full detail: `rajat_crm_native_frontend/docs/FRONTEND_REFERENCE.md` and
`rajat_crm_node_backend/docs/BACKEND_REFERENCE.md`.
