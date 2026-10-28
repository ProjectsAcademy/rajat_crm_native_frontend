# Known Issues, Pending Work and Baselines

Keep this list current: add what you discover, remove what you finish (and
mention the removal in WORK_LOG.md). "Status as of" dates matter — re-check
anything older than a few weeks.

## A. Pending work (status as of 2026-10-22)

1. **Production is behind development.** From the last known remote refs:
   - Backend `main` does NOT yet have: invoice order details (`157244a`),
     customer ledger (`0fc421a`, migration `20261004120000_customer_ledger`),
     vendor work (`9355321`, migration `20261022120000_order_vendor_work`).
   - Frontend `main` DOES have the ledger screens (merged PR #8) but not the
     dashboard-to-ledger link, vendor work or the English text fix.
   - Risk: a production web/APK build from frontend `main` shows ledger
     screens that call `/api/ledger/*`, which production does not serve
     (404). Release backend first: merge backend `dev_01` → `main`, run the
     production deploy workflow, then build the production frontend.
   - Verify with `git fetch && git log --oneline origin/main..origin/dev_01`
     in each repo before acting; these refs may be stale.
2. **RBAC is in shadow mode.** `RBAC_ENFORCE=false` (denials only logged as
   `[rbac-shadow]`) and `RBAC_STRICT=false` (legacy-access users keep full
   access) in the development `.env`; production values not recorded here.
   Plan: give every real user a group in Admin, watch `[rbac-shadow]` lines in
   `pm2 logs`, then set `RBAC_ENFORCE=true`, and `RBAC_STRICT=true` only when
   no user relies on legacy access. New key `ledger` must be granted to groups
   that should see the customer ledger.
3. **WhatsApp invoice sending** (manual button) — status as of 2026-10-28:
   **working on the dev server.** Template `invoice_share` is APPROVED
   (Utility, `en`, Document header + 4 body variables — matches
   `sendInvoiceTemplate`); number +91 97550 63737 is `CONNECTED`, quality
   GREEN, messaging limit `TIER_250` (IDs in INFRASTRUCTURE_AND_DEPLOY.md
   "WhatsApp Business (Meta) setup"). The owner sent a real invoice from the
   dev app to their own number on 2026-10-28 and confirmed the PDF and text.
   Billing is a prepaid INR balance (₹100 loaded; Indian cards are not
   accepted — keep it topped up). Still to do for production (backend `main`
   already has the send route): install Chromium in the production checkout,
   set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` in its `.env` (NOT
   `WHATSAPP_BOT_ENABLED` — the bot runs on one server only, now dev), pm2
   restart, then one test send from the production app.
   **Other templates (code on `dev_01` since 2026-10-28, FEATURES.md "WhatsApp
   messages to customers"):** `order_confirmation`, `payment_received`,
   `payment_reminder` were in review on 2026-10-28 — until Meta approves one,
   its send fails with the "not approved yet" message. `account_statement`
   was submitted without a Document header: submit `account_statement_pdf`
   (same body, Document header) and delete `account_statement`. After
   approval: test each one on dev to the owner's own number, then release
   (backend first: migration `20261028120000_payment_reminders`), then set
   `WHATSAPP_REMINDERS_ENABLED=true` on ONE server.
   Server memory: ~954 MB RAM, only ~320–440 MB available and ~1 GB of swap
   already in use with all hosted apps running. One send at a time is fine;
   any bulk/automatic sending must be queued (one Chromium at a time) or move
   to a bigger server (every send starts its own Chromium).
4. **WhatsApp bot — live on the DEV server since 2026-10-27.** The Meta
   webhook points at `dev-api.urjaradiant.com` (messages field subscribed,
   WABA subscribed to the app, bot enabled on dev only). First real test:
   "hi" → menu delivered and read. Still to verify with real data on a phone:
   the five-option list menu (pending amount, orders, invoices → PDF, payment
   history, statement PDF; list menu added 2026-10-27). Because the webhook
   belongs to the real number, the DEV server currently answers real
   customers; for production, point the webhook at `prod-api`, enable the bot
   there and disable it on dev (INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp bot
   webhook"). No admin screen for the `whatsapp_messages` log yet.
5. **Web hosting details unknown** — see INFRASTRUCTURE_AND_DEPLOY.md §3. Owner
   to record host, branches and build process.
6. **Not tested on physical devices**: the customer ledger (2026-10-04) and
   vendor work (2026-10-22) were tested on web (desktop and 390 px width)
   with synthetic data only.

## B. Tech debt and real bugs (not fixed yet)

1. Numbers/codes still generated as `count()+1`: vendors (`VEND`), inventory
   items (`ITEM`), purchases (`PUR-MMMYY-`), projects (`PRJ-MMMYY-`), tenders
   (`TND-MMMYY-`). Each collides permanently once a record has been deleted
   (HTTP 400 "already exists"). This exact bug stopped all new customers in
   production on 2026-10-27 (fixed for customers, see WORK_LOG); use the same
   "highest existing number + 1, retry on clash" fix for these. The vendor
   case already has a test marked `todo` in `test/auth-and-codes.test.ts`:
   remove the `todo` with the fix, and add the same test for the others.
2. Invoice number generation exists twice: `nextInvoiceNo` (invoices.ts) and
   `nextInvoiceNoTx` (orders.ts). Keep identical or merge into one helper.
3. Invoice and statement templates exist twice (frontend `utils/invoiceHtml.ts`
   / `utils/ledgerHtml.ts`, backend `src/utils/invoicePdf.ts` /
   `src/utils/statementPdf.ts`). Must be kept in sync by hand.
4. `cors({ origin: '*' })` — open CORS; consider restricting to the app
   origins.
5. Automated tests cover only part of the backend (as of 2026-10-27, list in
   LOCAL_DEV_AND_TESTING.md §4): not yet HR, purchases/stock, estimates,
   invoice CRUD, tenders/projects, media, calendar, admin, RBAC enforcement
   or PDF rendering. The frontend has no automated tests; UI is verified by
   hand. Nothing runs the tests on push yet (no CI job).
6. Detail screens opened from another module's stack (for example an order
   opened from a customer) may have no back button on native; the ledger
   detail screen has a fallback back button, other modules do not.
7. `WebTopNav` previously overflowed horizontally when the web app was used
   at phone width; resolved on 2026-10-27 with a responsive hamburger drawer
   when width < 768px.
8. List screens other than Orders load one request with `limit: 100` (or
   200) and have no paging, so rows past the newest 100 are only reachable
   through search (customers, invoices, estimates, vendors, stock movements,
   attendance, ...). Orders got 20-per-page paging on 2026-10-27; copy that
   pattern (`app/(app)/orders/index.tsx`) when a module grows past 100, and
   give its backend `orderBy` a unique tie-breaker (`id`) first — sorting
   only by `createdAt` repeats/skips rows across pages for imported batches.
9. Web at phone width (390 px, seen 2026-10-28): the Inventory list header's
   "Add" button and the item form dialog's "Update" button are cut off at the
   right edge (`app/(app)/inventory/index.tsx` header row,
   `components/InventoryFormSheet.tsx` web dialog header). Native is not
   affected; other form dialogs may have the same header.

## C. Looks wrong but is intended

- **Frontend TypeScript baseline: 85 errors** from `npx tsc --noEmit` (as of
  2026-10-22). All are TS2769 caused by the mandated
  `Platform.select({ web: { outlineStyle: 'none' } })` pattern. Metro does not
  type-check, the app runs fine. A change is fine if the count does not go up;
  never "fix" the pattern. Backend `tsc --noEmit` must be 0 errors.
- Dashboard "Outstanding" ≠ customer ledger balance when there are
  adjustments, opening balances, advances or cancelled orders (different
  definitions, see ARCHITECTURE.md "Money flow").
- Invoices do not appear in the customer ledger (decision 2026-10-04).
- Some order payments have payment mode "other" and the note "Imported
  balance (actual payment date not recorded)" — created by the ledger
  migration for old imported orders.
- `[rbac-shadow] deny ...` log lines are expected while RBAC is in shadow mode.
- Receipts cannot be edited, only deleted and re-entered (keeps order
  allocations consistent).
- nginx sites for the CRM are HTTP-only (Cloudflare Flexible TLS).

## D. Open questions for the owner

- Do dev and prod use the same Supabase database or two databases?
- Current web hosting (see A.4).
- Should vendor work costs feed a vendor payable / profit report later?
