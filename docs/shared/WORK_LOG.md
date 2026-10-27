# Work Log

Newest first. Every task adds an entry (template in
DOCUMENTATION_PROTOCOL.md). Entries before 2026-09 were reconstructed from git
history and are short; later entries were written at the time.

---

## 2026-10-27 — WhatsApp bot: "My invoices" and "Payment history"

- **Request:** owner picked two more free-tier bot options from a proposed
  list: "My invoices" and "Payment history".
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `bf48200` (code) + the docs commit after
  it; frontend `dev_01`: docs mirror only, no code. Key files:
  `src/lib/whatsapp.ts` (`sendList`), `src/lib/whatsappBot.ts`,
  `src/routes/invoices.ts` (`INVOICE_FULL_INCLUDE` exported).
  - The menu is now a WhatsApp list message (one "Menu" button, 5 rows)
    because reply buttons are limited to 3.
  - My invoices → latest 10 sales invoices → tap one → that invoice's PDF
    (same renderer as the manual send; free-form, so free). The row id
    `INV:<id>` is re-checked against the sender's customers.
  - Payment history → last 10 payments / receipts (mode, reference, receipt
    no.) + total received.
- **Database:** none.
- **Decisions:** drafts are listed with other invoices (client rarely
  updates invoice status); cancelled and purchase invoices are not. Old
  button ids still answer. Meta cost rules written into FEATURES.md.
- **Tested:** local throwaway PG16 + synthetic data, Meta Graph API mocked,
  signed webhook payloads: "hi" → list menu (row lengths within Meta limits);
  INVOICES → invoice list; own invoice → real PDF rendered (Chromium, 54 KB)
  + document + menu; another customer's invoice id and `INV:abc` → "not
  available", nothing sent; PAYMENTS with a direct payment and a lump-sum
  receipt; old PENDING button; unknown number → no data. `whatsapp_messages`
  rows checked. `npx tsc --noEmit` 0 errors.
- **Not tested / risks:** how real WhatsApp renders the list (not testable
  without Meta) — check on the phone after the dev deploy.
- **Deploy status:** not pushed (owner pushes `dev_01`; the webhook points
  at dev, so dev is where it can be tried).
- **Follow-ups:** none new.

## 2026-10-27 — HOTFIX: production could not create new customers

- **Symptom (production, crm.urjaradiant.com):** every new customer failed
  with "Customer code already exists. Use a different code."
- **Root cause:** blank customer codes were generated as `CUST` + (number of
  customers + 1). One customer had been deleted earlier, so with 49 customers
  the next code was CUST050 — which already existed. Every attempt collided.
- **Fix:** code = highest existing `CUSTnnn` + 1, retry with the next number
  if a parallel save took it; hand-typed codes unchanged.
- **Commits:** `687d09f` on branch `hotfix/customer-code-collision` (made from
  `main`, for a pull request into `main` → production deploy); cherry-picked
  to `dev_01` as `45d9b8a`. Only `src/routes/customers.ts`; no migration.
- **Tested:** throwaway database reproducing production (49 customers,
  highest CUST050): old code → 400 (bug reproduced); fixed code → CUST051;
  three simultaneous saves → CUST052–054; duplicate hand-typed code → 400;
  hand-typed VIP-1 then blank → CUST055.
- **Deployed:** merged into `main` and deployed to production by the owner on
  2026-10-27; creating customers verified working in production.
- **Follow-up:** the same count+1 numbering is still used for vendors
  (`VEND`), inventory items (`ITEM`), purchases (`PUR-`), projects (`PRJ-`)
  and tenders (`TND-`) — each can fail the same way after a delete
  (KNOWN_ISSUES B.1).

## 2026-10-27 — WhatsApp bot answers on dev

- **Root cause of "no reply":** the app's webhook subscription had the callback
  URL and `active: true` but no `fields` — Meta delivered nothing. Fixed by
  subscribing the `messages` field (Meta set it to v26.0). Also
  `WHATSAPP_BOT_ENABLED` set correctly on dev.
- **Result:** first real message ("hi") → `whatsapp_messages` row in
  (`text`, received) and out (`menu`, status `read`). Button flows to be
  verified next.
- **Note:** the webhook currently points at the DEV server (see KNOWN_ISSUES
  A.4).

## 2026-10-27 — WhatsApp bot: first dev test, two problems found

- **Symptom:** a test message to the business number got no reply.
- **Findings:** (1) no `POST /api/whatsapp/webhook` reached the dev server —
  Meta did not deliver the message (webhook verification GET had succeeded);
  (2) the dev `.env` had `WHATSAPP_BOT_ENABLED=True` and the code only
  accepted lowercase `true`, so the bot was off anyway. Dev database was fine
  (empty `whatsapp_messages` table readable).
- **Fix (code):** flag parsing is case-insensitive; a startup log line shows
  bot enabled/disabled and which settings are missing; a warning is logged
  when a webhook arrives while the bot is off. Troubleshooting steps added to
  INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp bot webhook".
- **Still open:** why Meta does not deliver (messages field subscription /
  app Live mode) — being checked with the owner.

## 2026-10-27 — WhatsApp self-service bot (Phase 1)

- **Request:** customers should manage things themselves on WhatsApp by
  picking options (order status, pending amount, ...). Owner chose Phase 1
  inside this backend (not n8n on a second server), menu with data options
  only, no "talk to us" option, no AI.
- **Done by:** Claude Code (Claude Opus).
- **Changes:** backend `51e2627`, frontend `71dac93` (docs + comment).
  Webhook `/api/whatsapp/webhook`, bot `src/lib/whatsappBot.ts`, message log
  `src/lib/whatsappLog.ts`, server statement PDF `src/utils/statementPdf.ts`,
  serialised PDF rendering, invoice sends now logged. Details: FEATURES.md
  "WhatsApp self-service bot".
- **Database:** migration `20261027120000_whatsapp_messages` — new table only.
- **Tested (local, synthetic data, Meta mocked, signed webhooks):**
  verification handshake (right/wrong token), unsigned and wrongly signed
  POSTs rejected (401), menu, all three options (numbers checked against the
  ledger), duplicate webhook answered once, unknown number answered once per
  day, other phone number id ignored, delivery status update, bot disabled →
  nothing processed, invoice send logged; statement PDF rendered on the server
  and checked visually.
- **Not tested:** real Meta webhooks (not configured yet), native app (no app
  changes).
- **Deploy status:** committed on `dev_01`; owner pushes (dev deploy applies
  the migration). Then configure the webhook — INFRASTRUCTURE_AND_DEPLOY.md
  "WhatsApp bot webhook"; pending item KNOWN_ISSUES A.4.

## 2026-10-27 — WhatsApp Business (Meta) account setup recorded

- **Done by:** owner in Meta Business Suite, guided by Claude Code.
- **What happened:** repeated setup attempts had created several WhatsApp
  Business Accounts (one with a Meta-provided +1 number); the owner deleted
  the duplicates. The live account is WABA `1763205934724539` with
  +91 97550 63737 (phone number ID `1368505093020145`, verified,
  `CLOUD_API`). Template `invoice_share` resubmitted in that account. A
  permanent token was generated for system user `rajat_crm_api_admin` (the
  Employee-level system user could not get WhatsApp permissions).
- **Docs:** INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp Business (Meta) setup";
  KNOWN_ISSUES A.3 updated (server setup still pending).
- **Billing:** Meta rejected the owner's Indian-issued Visa card ("India
  credit cards are currently not supported"); WhatsApp messages are paid from
  a prepaid INR balance instead (₹100 loaded manually). The 131042 error
  message now tells the user to top up that balance.
- **Code:** backend error hint for code 131042 (commit with this entry).

## 2026-10-27 — WhatsApp invoice button ready for the first real send

- **Request:** while the Meta template is under review, invoices must be
  shared on WhatsApp ONLY when the user taps the button, to the number saved
  in the customer's profile (no automation yet).
- **Done by:** Claude Code (Claude Opus).
- **Changes:** backend `8901e32`, frontend `bbf09c1`. Sending was already
  manual-only; hardened it: phone + configuration checked before the PDF is
  rendered (400 / 503), plain-language Meta error messages, clear "Chromium
  not installed" error, app waits 60 s for the send (prevents a false failure
  followed by a duplicate paid send), immediate message when the customer has
  no phone. Docs: FEATURES (WhatsApp), INFRASTRUCTURE (one-time server
  setup), LOCAL_DEV_AND_TESTING (testing without sending), KNOWN_ISSUES A.3.
- **Meta status:** app + number +91 97550 63737 registered; template
  `invoice_share` (Utility, English, Document header, 4 variables) submitted,
  under review.
- **Tested:** real API + real PDF rendering with Meta's API mocked (no message
  sent): success payload (media upload + template with the 4 values), no
  phone, server not configured, Chromium missing, template-not-approved
  (132001) and expired-token (190) errors; web UI confirm/alert flow.
- **Not tested:** a real send through Meta (needs the approved template and
  server setup); native app.
- **Deploy status:** committed on `dev_01`; owner pushes, then does the server
  setup in KNOWN_ISSUES A.3.

## 2026-10-22 — Workspace guide for the parent folder

- **Request:** the owner opens the parent folder (both repos side by side) so
  the AI can see both; add a guide there explaining the two repos.
- **Done by:** Claude Code (Claude Opus).
- **Changes:** backend `5f9c901`, frontend `241b480`.
  `docs/shared/WORKSPACE_GUIDE.md` (versioned source of the workspace-root
  `AGENTS.md`) and `scripts/setup-workspace-root.sh`, which writes
  `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`,
  `.cursor/rules/crm-workspace.mdc`, `.windsurfrules`, `.clinerules` into the
  parent folder (skips files it did not generate) and registers
  `.agents/rules/crm-workspace.md` in the AG Kit toolkit with the kit's own
  `generate_manifest.py`, rolling back if `validate_kit.py` fails.
- **Workspace (not versioned):** script run on the developer machine; AG Kit
  validator passes. `SERVER_README.md` in the parent folder marked LEGACY.
- **Tested:** script run twice on the real workspace (idempotent); run in a
  fake workspace with a hand-written `GEMINI.md` (left untouched) and a
  missing sibling repo (warning); doc link check.
- **Deploy status:** committed on `dev_01`; owner pushes.

## 2026-10-22 — Project handover documentation

- **Request:** structure both repos so that any new AI assistant (or person)
  can understand the whole project from either repo alone, avoid known
  mistakes, and keep documenting its own work.
- **Done by:** Claude Code (Claude Opus).
- **Changes:** backend `f05d7ef`, frontend `341f25f`.
  - `AGENTS.md` in each repo as the single entry point; pointer files for
    Claude (`CLAUDE.md`), Gemini / Antigravity (`GEMINI.md`,
    `.agents/rules/`), Copilot, Cursor, Windsurf and Cline.
  - `docs/shared/` (mirrored): README index, PROJECT_OVERVIEW, RULES,
    ARCHITECTURE, FEATURES, INFRASTRUCTURE_AND_DEPLOY, LOCAL_DEV_AND_TESTING,
    KNOWN_ISSUES_AND_PENDING, DOCUMENTATION_PROTOCOL, WORK_LOG (backfilled
    from git history).
  - `docs/BACKEND_REFERENCE.md` and `docs/FRONTEND_REFERENCE.md` replace the
    old CLAUDE.md content after a full code audit; the owner's UI rules moved
    verbatim to `docs/FRONTEND_UI_RULES.md`.
  - `scripts/check-shared-docs.sh` in both repos.
  - Backend `.env.example` now lists every variable; `server.ts` comment
    translated to English.
- **Corrections found during the audit** (old docs were wrong): many routes
  documented as read-only have full CRUD; salary payments allow several
  installments per month; `RBAC_STRICT=false` grants full access to
  legacy-access users only; `update.sh` is tracked in git but the server
  copies have local edits.
- **Server reference:** content of the old `SERVER_README.md` (kept outside
  the repos) is now in INFRASTRUCTURE_AND_DEPLOY.md, without personal
  details.
- **Tested:** all relative links and code paths referenced in the docs exist
  (automated check); `check-shared-docs.sh` reports identical copies; backend
  `tsc --noEmit` 0 errors.
- **Open questions recorded:** web hosting details, whether dev and prod
  share one database (KNOWN_ISSUES D).
- **Deploy status:** committed on `dev_01`; owner pushes.

## 2026-10-22 — Vendor Work on orders

- **Request:** when creating an order, record work done by a third party
  (vendor): who, what, and for how much.
- **Done by:** Claude Code (Claude Opus).
- **Changes:** backend `9355321`; frontend `e30d1e3`, `cfdbd41` (English text
  fix). New model `OrderVendorWork`; orders POST/PUT accept `vendorWorks`
  (PUT replaces the list); order detail includes them; vendor detail returns
  `orderWorks`; vendor delete blocked while work exists. Frontend:
  `OrderFormSheet` "Vendor Work" section (one line per row on wide web,
  stacked on native/phone width), order detail section with total vendor cost,
  vendor profile "Order Work" section.
- **Database:** migration `20261022120000_order_vendor_work` — new table only.
- **Decisions:** owner chose "work + amount, multiple vendors per order" over
  a single vendor field. Amount is optional. Not linked to ledger or profit.
- **Tested:** throwaway database, synthetic vendors; API create/update/clear,
  validation errors, vendor delete guard; UI at 1280 px and 390 px web.
- **Not tested:** physical Android/iOS device.
- **Deploy status:** committed on `dev_01`; owner pushes. Not on `main`.

## 2026-10-22 — Dashboard breakdown opens the customer ledger

- **Changes:** frontend `eaf5038`. Rows in "Outstanding/Collected by Customer"
  (dashboard revenue card) open `/ledger/<customerId>` (or the customer profile
  without `ledger` permission). Fixed a missing separator in the ledger ageing
  footer.
- **Tested:** web 1280 px and 390 px with synthetic data.

## 2026-10-04 — Customer ledger, receipts, adjustments, receivables

- **Request:** client wants to manage the customer ledger professionally.
- **Done by:** Claude Code.
- **Changes:** backend `0fc421a`; frontend `11c4e48`. See FEATURES.md
  "Customer Ledger and Receivables" for the full rule set.
- **Database:** migration `20261004120000_customer_ledger` — new tables
  `customer_receipts`, `customer_ledger_entries`; columns
  `customers.opening_balance`, `customers.opening_balance_date`,
  `order_payments.receipt_id`; data backfill of payment rows for imported
  orders whose paid amount had no payment entries.
- **Decisions (owner, 2026-10-04):** all four parts in scope; debit = orders
  only; backfill approved.
- **Also fixed:** adding a payment to such an imported order used to reset its
  paid amount to the new payment only (paid amount is recomputed from rows).
- **Tested:** synthetic data on a throwaway database; per-customer consistency
  check (closing balance = position balance = ageing total); UI on web.
- **Deploy status:** pushed to `dev_01`; frontend ledger screens were merged to
  `main` (PR #8) while the backend ledger is not on `main` yet — see
  KNOWN_ISSUES A.1.

## 2026-09-25 — Make Invoice from order; order details on invoices

- **Changes:** backend `157244a`; frontend `37a1b2d`. "Make Invoice" button on
  the order screen (prefilled invoice form). Invoices made from an order show
  Order No., Event Date (= order date), Delivery date and Project on screen,
  print/PDF and the WhatsApp PDF.

## 2026-09-16 to 2026-09-18 — Production outage fix and deploy automation

- **Outage:** dev and prod API down — about 22 `PrismaClient` instances
  exhausted the 15-connection Supabase pooler. Fixed with one shared client
  (`src/lib/prisma.ts`, explicit `connection_limit`). Reverted once by mistake
  on 2026-09-17, restored 2026-09-18 (`4dd98b2`). Separately, the dev API was
  unreachable because of the nginx / Cloudflare Flexible setup.
- **Deploy automation:** `.github/workflows/deploy.yml` — automatic deploy on
  push to `dev_01`, manual "Run workflow" for `main`. Server `update.sh`
  needed nvm sourcing for non-interactive SSH.
- Server reference written (now `docs/shared/INFRASTRUCTURE_AND_DEPLOY.md`).

## 2026-09-12

- Fixed permanent order/invoice/estimate number deadlock (`count()+1` →
  month-prefix max lookup).
- Dashboard revenue got its own permission key `revenue`.
- Native layout fixes (dashboard split row, invoice/estimate items); admin nav
  button height glitch.
- `update.sh` added to the backend repo.

## 2026-09-03 / 2026-09-04

- Invoices: order linking, address fields, inventory links, discounts; printable
  letterhead invoice (from the client's paper bill book); calendar date
  pickers.
- Estimates: full CRUD, inventory picking, discounts, order link.
- Dashboard: Collected / Outstanding by customer breakdowns.
- Back navigation and breadcrumbs across all modules; web dashboard design
  fidelity fixes.

## 2026-08-23

- RBAC legacy-access flag and UI; dashboard calendar and revenue; full CRUD for
  invoices and GST; customer "Related Records".

## 2026-07-04 to 2026-07-13

- RBAC: groups, feature permissions, super-admin screens, HR sub-permissions,
  shadow mode (`RBAC_ENFORCE` / `RBAC_STRICT`).
- Attendance: daily marking, editing, monthly and yearly reports.
- Payroll: salary components, salary payment ledger with partial installments,
  employee-wise ledger, month-year picker.
- Missing `order_items.rental_days` migration added.

## 2026-05-25 to 2026-06-12 — Initial build

- Backend and frontend created module by module: HR, GST, finance, estimates,
  inventory and stock, orders, customers / vendors / inventory CRUD, employees,
  purchases with stock, projects, tenders. Data migrated from the old Django
  system (Prisma migrations `20260524133318_init` onwards).
- Web build configured for Netlify (`d0ce897`, 2026-05-27); Expo dynamic config
  for separate Dev/Prod Android apps.
