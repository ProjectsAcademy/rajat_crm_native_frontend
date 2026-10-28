# Work Log

Newest first. Every task adds an entry (template in
DOCUMENTATION_PROTOCOL.md). Entries before 2026-09 were reconstructed from git
history and are short; later entries were written at the time.

---

## 2026-10-28 — Backend released; separate WhatsApp numbers for production and dev

- **Request:** continue the release (plan step 0.1); keep dev and production
  WhatsApp apart, because their databases hold different customers.
- **Done by:** the owner (server and Meta), with steps from Claude Code (Opus 5.5)
- **Changes:** docs and comments only (this commit): INFRASTRUCTURE_AND_DEPLOY.md
  (both numbers, adding and registering a number, webhook override),
  RULES 10, FEATURES (bot safety), KNOWN_ISSUES A.1 / A.3 / A.5 and new B.9,
  plan step 0.1, BACKEND_REFERENCE env table, `.env.example`,
  `src/routes/whatsappWebhook.ts` comment. No behaviour change.
- **Production:** backend `main` at `750c73b` (PR #15); `prisma migrate
  status` up to date (27 migrations); Chromium PDF check passed; `.env` got
  the WhatsApp values with number ID `1436335366229383`, bot on, reminders
  off, its own verify token.
- **Meta:** second number +91 96859 03733 added to the "Rajat Electricals"
  WABA and registered for the Cloud API (PIN kept by the owner); webhook
  override on it → `prod-api`. The app's callback URL stays `dev-api`, used
  by the first number +91 97550 63737, now the dev number.
- **Decisions:** the new number is production's (owner's choice), the first
  one stays on dev; each server answers only its own number (the bot already
  ignored other phone number ids), so the bot runs on both.
- **Tested:** startup log `bot ENABLED; app secret set; verify token set;
  phone number id set`; webhook handshake on `prod-api` → `ok`; Meta shows
  the override (`webhook_configuration.phone_number`).
- **Not tested / risks:** "hi" to the production number (owner testing);
  template sends from production need the app release. The dev server still
  sends from a real number — a dev database holding real customers' phones
  could message them (a recipient allow-list for dev is proposed, not built).
- **Found:** tender title over 200 characters → 500 (KNOWN_ISSUES B.9), from
  an old entry in the production error log.
- **Deploy status:** backend released; app release next.
- **Follow-ups:** app release, template test sends on production,
  `WHATSAPP_REMINDERS_ENABLED=true` on production when wanted, RBAC (0.2).

---

## 2026-10-28 — Production backup; dev and prod databases are separate

- **Request:** step-by-step release to production, moving the bot and RBAC
  (plan steps 0.1 / 0.2); first, a backup of the production database.
- **Done by:** the owner, with steps from Claude Code (Opus 5.5)
- **Changes:** docs only — INFRASTRUCTURE_AND_DEPLOY.md §4 (backup recipe,
  databases confirmed separate), KNOWN_ISSUES A.1 (current release gap),
  plan step 0.1 status.
- **Database:** none changed. Backups: dev database 80 tables, production
  554 KB / 77 tables — the difference is exactly the three tables the
  unreleased migrations create, which also confirms dev and prod are
  different databases (the docs had said "may be the same").
- **Decisions:** backups need `pg_dump` 17 (Supabase runs PostgreSQL 17;
  Ubuntu 24.04's 16 refuses) and must use the production `DIRECT_URL`; a
  developer machine's `.env` points at the dev database (the first attempt
  backed up dev by mistake).
- **Tested:** `pg_restore --list` on both dumps.
- **Not tested / risks:** a test restore of the production dump.
- **Deploy status:** nothing deployed yet; next is the backend release (A3).
- **Follow-ups:** plan 0.1 release and bot move, 0.2 RBAC — RBAC groups must
  be set up in BOTH apps (separate databases).

---

## 2026-10-28 — WhatsApp automation plan; step 0.4 customer opt-out (STOP / START)

- **Request:** the owner wants every WhatsApp automation idea discussed the
  same day (customer side and the business's own team), planned and built one
  by one — faster, without people, and secure.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** new `docs/shared/WHATSAPP_AUTOMATION_PLAN.md` (17 steps,
  security rules, templates, status; linked from README and KNOWN_ISSUES
  A.4). Step 0.4: backend `dev_01` `063e79d`; frontend `dev_01` `20a79e6`;
  docs in the commits after them. Key files: `src/lib/whatsappBot.ts`
  (`STOP_WORDS`, `setOptOut`), `src/lib/customerMessages.ts` (`automatic`),
  `src/lib/paymentReminders.ts`, `src/routes/ledger.ts`; app
  `utils/whatsappSend.ts` (`optedOut`), ledger, order and customer screens.
- **Database:** migration `20261028140000_customer_whatsapp_opt_out` — one
  nullable column `customers.whatsapp_opt_out_at` (additive).
- **Decisions:** 0.4 first because automatic reminders already exist and must
  be stoppable before they are switched on; only the customer changes the
  opt-out (STOP / START), staff cannot; manual sends stay possible with a
  note in the confirm dialog. Steps 0.1 and 0.2 are the owner's server work.
- **Tested:** `npm test` 50 pass + 1 todo; `test/whatsapp-opt-out.test.ts`
  (5 tests through signed webhook messages: greeting, STOP for every customer
  with the number, scheduler skips them while a manual send works, no
  switching reminders on, START). Fails as expected without the opt-out
  check. The scheduler tests now switch off reminders left by other test
  files (they had started to count each other's rows). Frontend tsc 85 =
  baseline.
- **Not tested / risks:** the app screens were not opened in a browser this
  time — port 3001 on this machine was taken by the owner's own
  `npm run dev`, so the local UI stack could not start (changes are a text
  line on three screens and a note in the confirm dialog). On a real phone
  after deploy: send STOP and START to the business number.
- **Deploy status:** not pushed.
- **Follow-ups:** plan step 0.3 next (staff WhatsApp identity); submit the
  three templates of steps 1.1–1.3 now (texts in the plan).

---

## 2026-10-28 — Web at phone width: header buttons no longer cut off

- **Request:** fix KNOWN_ISSUES B.9 — at 390 px the Inventory list's "Add"
  button and the item form's "Update" button were cut off.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** frontend `dev_01` `03036d6`. `app/(app)/inventory/index.tsx`
  (header: title + a button group that wraps; 16 px side padding under
  600 px) and the web dialog header (`w.header`: `flexWrap`, `rowGap`) of
  13 form sheets: Inventory, Customer, Vendor, Order, Invoice, Estimate,
  Purchase, GST, Project, Tender, User, Group, Stock movement.
- **Database:** none.
- **Decisions:** root cause was one shared pattern — a header row that
  cannot wrap inside a dialog with `overflow: hidden` — so every dialog with
  it was fixed, not only Inventory. Attendance, salary component/payment and
  the ledger sheets already wrapped and were left alone.
- **Tested:** web at 390 px: Inventory list and the Inventory, Customer,
  Vendor, Order and Invoice dialogs — buttons on a second line, nothing
  beyond the screen edge; at 1280 px the same screens look as before.
  Frontend tsc 85 = baseline.
- **Not tested / risks:** the other 8 dialogs only by reading (same style
  line); native unaffected (these styles are used by the web layouts only).
- **Deploy status:** not pushed.
- **Follow-ups:** none.

---

## 2026-10-28 — WhatsApp bot: "Our items" (inventory with rates)

- **Request:** add inventory to the customers' WhatsApp menu so they stop
  calling the client to ask what is available.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `7921531`; frontend `dev_01` `0b08a71`; docs
  in the commits after them. Key files: `src/lib/whatsappBot.ts`
  (`categoryRows`, `categoryItemsText`), `src/routes/inventory.ts`,
  `prisma/schema.prisma`; app `components/InventoryFormSheet.tsx`,
  `app/(app)/inventory/index.tsx` and `[id].tsx`, `constants/colors.ts`
  (`Colors.whatsapp`, now used by every WhatsApp button and icon).
- **Database:** migration `20261028130000_inventory_show_on_whatsapp` — one
  new column `inventory.show_on_whatsapp`, default false (additive).
- **Decisions (owner, 2026-10-28):** registered customers only; name,
  description and rate; no photos for now (a category photo PDF is the next
  step); only items ticked "Show on WhatsApp". Mine: no stock numbers and a
  "call to book or check availability" line, because orders do not move
  stock and the system cannot say what is free on a date; 80 items per
  category at most; rate 0 shows "rate on request".
- **Tested:** `test/whatsapp-bot-items.test.ts` (6 tests, signed webhook
  messages, fake Meta): menu row, categories (ticked + active only, "Other",
  pages of 9 + "More categories"), item text, unregistered number gets
  nothing, the flag in the inventory API. Fails as expected when the
  "Show on WhatsApp" filter is removed. Web at 1280 and 390 px: the switch
  saves, the list shows the icon, no horizontal scroll. Seen on the way and
  not caused by this change: KNOWN_ISSUES B.9 (cut-off buttons at 390 px).
- **Not tested / risks:** on a real phone through Meta (needs a push to dev);
  native layout of the switch reviewed in code only (same row style as the
  existing "Active Status" switch).
- **Deploy status:** not pushed.
- **Follow-ups:** tick the items to show (and fill their categories and
  rates) in the app after the release; photo catalogue PDF per category;
  availability by date would need orders to reserve inventory.

---

## 2026-10-28 — WhatsApp templates: order confirmation, payment received, payment reminder (automatic), statement

- **Request:** use the templates submitted to Meta on 2026-10-27
  (`order_confirmation`, `payment_received`, `payment_reminder`,
  `account_statement`) as soon as they are approved.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `551981a`; frontend `dev_01` `b3291dc`; docs
  in the commits after them. Key files: `src/lib/customerMessages.ts`,
  `src/lib/paymentReminders.ts`, `src/lib/whatsapp.ts` (`TEMPLATES`,
  `sendTemplate`), `src/routes/ledger.ts`, `src/routes/orders.ts`,
  `src/server.ts`; app `utils/whatsappSend.ts`, `app/(app)/ledger/[id].tsx`,
  `app/(app)/orders/[id].tsx`, `services/api.ts`; docs FEATURES.md "WhatsApp
  messages to customers", RULES.md 10, ARCHITECTURE, INFRASTRUCTURE,
  KNOWN_ISSUES A.3, both references.
- **Database:** migration `20261028120000_payment_reminders` — new table
  `payment_reminders` only (additive, no data change).
- **Decisions (owner, 2026-10-28):** payment reminders automatic per customer
  (off / 7 / 15 / 30 days, 10 AM IST, not under ₹500 due) plus a manual
  "Send Reminder"; order confirmation and payment receipt offered right after
  saving (person confirms) and available from buttons; statement as a PDF
  through a new template `account_statement_pdf`, because the submitted
  `account_statement` has no Document header. My choices: reminder figures
  are all-time ledger totals with the all-time statement attached (they must
  add up); receipt slices are not sent alone; cancelled orders get no
  confirmation; reminders only 10:00–19:00 IST; the scheduler claims each
  customer per day so two servers on a shared database cannot both send.
- **Tested:** `npm test` 39 pass + 1 todo; the new
  `test/whatsapp-templates.test.ts` (14 tests) checks every template's
  variables and header against a fake Meta, receipt vs slice, no phone,
  cancelled order, Meta error naming the template, reminder settings, the
  scheduler (before 10 AM, under ₹500, once a day, a due customer gets the
  PDF) and the next-reminder date. Migration SQL equals the schema
  (`prisma migrate diff` on a throwaway PostgreSQL). App on web against a
  throwaway database with WhatsApp unconfigured, at 1280 and 390 px: every
  button and after-save offer shows the right name, number and amount; sends
  report the server's "not set up" message; reminder setting saves; no
  horizontal scroll. Frontend tsc 85 = baseline.
- **Not tested / risks:** a real send of the four new templates (still in
  review at Meta; `account_statement_pdf` not submitted yet); native
  Android/iOS (layout reviewed in code only); the scheduler on a real server.
- **Deploy status:** not pushed.
- **Follow-ups:** submit `account_statement_pdf`; after approval test each
  template on dev to the owner's own number; release backend first; set
  `WHATSAPP_REMINDERS_ENABLED=true` on ONE server (KNOWN_ISSUES A.3).

---

## 2026-10-28 — WhatsApp template `invoice_share` approved; first real send on dev

- **Request:** Meta approved the `invoice_share` template; check it against
  the code and test the invoice "WhatsApp" button for real.
- **Done by:** Claude Code (Opus 5.5) for the checks and docs; the owner did
  the test send.
- **Changes:** docs only (this entry, KNOWN_ISSUES A.3,
  INFRASTRUCTURE_AND_DEPLOY.md template row); commits on `dev_01` in both
  repos after this entry. No code change was needed.
- **Database:** none (the owner's test customer and invoice were created on
  the dev app).
- **Decisions:** none new; sending stays manual.
- **Tested:** read-only Graph API calls with the dev token: template
  `APPROVED`, `UTILITY`, language `en`, components HEADER `DOCUMENT` + BODY
  with exactly 4 variables (same text as FEATURES.md) — matches the payload
  of `sendInvoiceTemplate` and the `WHATSAPP_TEMPLATE_*` values; number
  `CONNECTED`, quality GREEN, `TIER_250`, ID equals `WHATSAPP_PHONE_NUMBER_ID`.
  The owner then sent an invoice from the dev app to their own number: it
  arrived with the PDF and the expected text.
- **Not tested / risks:** production — its `.env` has no WhatsApp values yet
  and Chromium is not confirmed there (KNOWN_ISSUES A.3).
- **Deploy status:** dev server already had the code and configuration;
  nothing deployed.
- **Follow-ups:** production setup (KNOWN_ISSUES A.3); keep the prepaid
  balance topped up (sends fail with Meta code 131042 when it is empty).

---

## 2026-10-27 — Home dashboard redesign & responsive navigation

- **Request:** Redesign the Home dashboard of the app (`rajat_crm_native_frontend`) with a new visual design, fully responsive on web and native, keeping all logic, data fetching, features, permissions and existing color tokens. In follow-up, make `WebTopNav` responsive with a mobile hamburger menu on narrow viewports.
- **Done by:** Antigravity (Gemini 2.5)
- **Changes:** frontend `ag/dashboard-redesign`. Key files: `app/(app)/index.tsx`, `components/DashboardCalendar.tsx`, `components/RevenueChart.tsx`, `components/dashboard/ModuleCard.tsx`, `components/WebTopNav.tsx`, `docs/FRONTEND_REFERENCE.md`.
- **Database:** none.
- **Decisions:** Responsive layout driven by `useWindowDimensions()` with adaptive column counts (2 cols on phone, 3 on tablet, 4-5 on desktop); side-by-side Calendar and Revenue widgets when width >= 960px, cleanly stacked on narrower screens with independent gating; created reusable presentational `ModuleCard` supporting both compact (horizontal) and full (vertical) cards; unified design system tokens from `constants/colors.ts`; replaced `Alert.alert` with `utils/dialogs.ts` for cross-platform compliance; upgraded `WebTopNav` with mobile hamburger drawer at `< 768px` so web users on phones get full navigation without horizontal overflow.
- **Tested:** Tested on Chrome web at 1440px, 768px, and 390px widths with BEFORE and AFTER screenshots (including closed and open hamburger drawer states); all 10 feature checklist items verified; TypeScript error count strictly preserved at 85 baseline; `npm run verify` passed.
- **Not tested / risks:** Physical Android and iOS devices could not be directly tested in this environment; verified through Expo web responsive viewports.
- **Deploy status:** Committed on branch `ag/dashboard-redesign` in `rajat_crm_native_frontend`; merged into frontend `dev_01` by the owner (PR #9, merge `db09cbf`). `docs/shared` was mirrored to the backend on 2026-10-28.
- **Follow-ups:** Test on real Android APK build.

---

## 2026-10-27 — Code map (`npm run map`) and a short reading path for agents

- **Request:** agents (Antigravity + Gemini) answer slowly because they read
  every document before every task; the owner asked for an accurate,
  easy-to-maintain index/graph of the repos so agents finish faster with
  less context.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `461d69c`; frontend `dev_01` `5f3dcc1`; docs
  in the commits after them. Key files: `scripts/code-map.js` (identical in
  both repos), `docs/shared/CODE_MAP.md` (generated), `scripts/verify.js`
  (map check; both scripts must be identical), `AGENTS.md` in both repos
  (new "How to start a task"), `docs/shared/README.md`, `WORKSPACE_GUIDE.md`,
  `DOCUMENTATION_PROTOCOL.md`, `BACKEND_REFERENCE.md` §4 and
  `FRONTEND_REFERENCE.md` §4 (hand-written route/API tables replaced by a
  pointer to the map plus the notes the map cannot show).
- **Database:** none.
- **Decisions:** the map is generated from the code (regex over this
  project's conventions, no dependencies) and never edited by hand;
  `npm run verify` fails when it is stale, so agents can trust it. It holds
  no dates or commit hashes, so it changes only when the code does. The
  mandatory reading of ~80 KB of docs before any change is replaced by:
  RULES.md, then search CODE_MAP / KNOWN_ISSUES / FEATURES for the module,
  plus a "the task touches → also read" table; the full reading order stays
  in README.md for whole-system questions. The hand-written route tables
  were removed because they duplicated the map and had to be edited on every
  API change.
- **Tested:** the map covers 131 endpoints, 124 app API functions (every one
  matched to a backend route), 112 frontend files, 40 models. Rows for
  orders, ledger, calendar (permission keys from constants), media (in-file
  permission middleware) and dashboard checked against the code. A route
  added without regenerating → `code-map.js --check` exits 1. The same map is
  produced from either repo. The "payment → order status" trace that took
  the Antigravity trial ~25 tool calls is one search (`recalcOrderPaid`).
- **Not tested / risks:** the parser follows the current conventions
  (`router.get('...')` with single quotes, `api.get(...)` calls inside the
  `xxxApi` objects of `services/api.ts`, `prisma.<model>.<op>(`); tables
  reached through a dynamic delegate (`media.ts` `getModel`) are not shown.
  A new convention needs a parser change — missing rows or entries in map §7
  are the symptom. The speed-up with Antigravity is not measured yet.
- **Deploy status:** not pushed. No runtime change.
- **Follow-ups:** give Antigravity the same prompt as in its trial and
  compare time and tool calls. Map §7 lists 7 `services/api.ts` functions
  that no app file calls (candidates for removal).

## 2026-10-27 — Automated checks: `npm test` (backend API tests) and `npm run verify`

- **Request:** the owner will continue with a free AI tool (Antigravity +
  Gemini). A trial of it on a test branch showed it fixes bugs well but
  forgets parts of the done-checklist (KNOWN_ISSUES not updated, tests that
  bypass the HTTP route, leftover helper scripts). Asked for (1) one command
  that checks a finished task and (2) automated tests.
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `f076008`; frontend `dev_01` `b0eb803`; docs
  in the commits after them. Key files: backend `test/run.js`,
  `test/harness.ts`, `test/*.test.ts`, `test/package.json`,
  `scripts/verify.js`, `package.json` (`test`, `verify`), `src/app.ts` (no
  morgan log when `NODE_ENV=test`); frontend `scripts/verify.js` (identical
  copy), `package.json` (`verify`).
- **Database:** none (tests use their own throwaway PostgreSQL).
- **Decisions:** `embedded-postgres` instead of a local PostgreSQL install,
  so the tests run on the owner's Windows machine too; kept in
  `test/package.json` so the small servers never download the 60–140 MB
  binaries. Tests drive the real app over HTTP (not functions directly).
  `verify` runs after committing and fails on uncommitted/leftover files;
  conventional-commit subjects and `Alert.alert` are warnings only. The vendor
  `count()+1` bug (KNOWN_ISSUES B.1) is a `todo` test, not fixed here.
- **Tested:** `npm test` on Linux arm64 (Node 22.22): 25 pass, 1 todo. Each
  check was proven to catch its bug by re-introducing it: "paid only when
  paid > total" → 4 tests fail; orders sorted by `createdAt` only → paging
  test fails (it needs newer orders mixed with an imported batch — a batch
  alone pages correctly, found while writing it); customer codes back to
  `count()+1` → code test fails. `verify` flagged a planted leftover file
  with Devanagari text, `new PrismaClient()` and a Supabase-style URL, plus
  uncommitted files and a missing WORK_LOG entry.
- **Not tested / risks:** not run on Windows or macOS here (the trial run on
  the owner's Windows machine used the same library successfully). Tests
  cover only part of the backend (KNOWN_ISSUES B.5); no CI job runs them yet.
- **Deploy status:** not pushed. No runtime change apart from the morgan line.
- **Follow-ups:** fix B.1 with tests; a GitHub Actions job running
  `npm run verify -- --quick` + `npm test` on push; more tests per module.

## 2026-10-27 — Orders: delete a wrong payment; 20 orders per page

- **Request:** (1) a payment saved by mistake could only be edited — no way
  to delete it or set it to 0; (2) paginate the orders list, 20 per page,
  with search working as before. (3) "show totals on all cards" — the owner
  said to skip it for now (cards already show counts; the intent was unclear).
- **Done by:** Claude Code (Opus 5.5)
- **Changes:** backend `dev_01` `c9cd4ad`; frontend `dev_01` `19115e3`; docs
  in the commits after them. Key files: backend `src/routes/orders.ts`;
  frontend `components/PaymentFormSheet.tsx`, `app/(app)/orders/index.tsx`,
  `services/api.ts` (`ordersApi.removePayment`, `list` takes `page`).
- **Database:** none.
- **Decisions:** delete rather than allowing 0 (a 0 row is noise in the
  ledger and payment history). Receipt slices stay locked — they are
  removed by deleting the receipt in the ledger. Pager = Prev / Next with
  "Page X of Y" and "21–40 of N", shown only when there is more than one page.
- **Bug found while testing:** the orders list sorted only by `createdAt`;
  rows created in one batch (imported data) share it, so pages repeated some
  orders and skipped others. Now `createdAt` desc, then `id` desc.
  Other list screens still load 100 rows without paging (KNOWN_ISSUES B.8,
  replacing the old B.8 "payments cannot be deleted").
- **Tested:** local throwaway PG16, synthetic data (46 orders), backend on
  3001, Expo web on 8099. API: 3 pages of 20/20/6 with every order exactly
  once, search over all pages (10 matches, no pager), delete → order back
  to pending and paid 0, second delete → 404, another order's payment id →
  404, receipt slice → 400. UI (1280 px and 390 px): Next/Prev, page info,
  search resets the pager; edit sheet → Delete Payment → confirm text →
  Payments (0), status PENDING; add mode has no Delete button. No page
  errors. Backend `tsc` 0; frontend `tsc` 85 (baseline).
- **Not tested / risks:** native Android/iOS (code path is shared
  `Modal`/`FlatList`, confirm uses `Alert.alert` there).
- **Deploy status:** pushed to `dev_01` by the owner (dev auto-deploy);
  production not yet.
- **Follow-ups:** KNOWN_ISSUES B.8 (paging for other lists when needed).

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
