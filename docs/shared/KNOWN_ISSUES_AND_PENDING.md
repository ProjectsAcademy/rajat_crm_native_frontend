# Known Issues, Pending Work and Baselines

Keep this list current: add what you discover, remove what you finish (and
mention the removal in WORK_LOG.md). "Status as of" dates matter — re-check
anything older than a few weeks.

## A. Pending work (status as of 2026-10-22)

1. **Production is behind development** (as of 2026-10-28, release in
   progress — WHATSAPP_AUTOMATION_PLAN.md step 0.1):
   - Backend: released 2026-10-28 (PR #15, production `main` at `750c73b`;
     `npx prisma migrate status` on the server: 27 migrations, schema up to
     date). Production WhatsApp set up the same day (A.3, A.5).
   - Frontend `main` lacks the dashboard redesign, vendor work, the WhatsApp
     buttons, the inventory "Show on WhatsApp" switch and the phone-width
     fixes. The app release is the next step.
   - Production database backup taken 2026-10-28 (INFRASTRUCTURE_AND_DEPLOY.md
     §4).
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
   `sendInvoiceTemplate`); the first number +91 97550 63737 (now the dev
   number) is `CONNECTED`, quality GREEN, messaging limit `TIER_250`; the
   production number +91 96859 03733 was added 2026-10-28 (IDs in
   INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp Business (Meta) setup"). The owner sent a real invoice from the
   dev app to their own number on 2026-10-28 and confirmed the PDF and text.
   Billing is a prepaid INR balance (₹100 loaded; Indian cards are not
   accepted — keep it topped up). Production (2026-10-28): Chromium checked,
   `.env` set with the production number; still to do: one test send from
   the production app once the app is released.
   **Other templates (code on `dev_01` since 2026-10-28, FEATURES.md "WhatsApp
   messages to customers"):** `order_confirmation`, `payment_received`,
   `payment_reminder` approved (owner, 2026-10-28); real sends not tested
   yet. An unapproved template's send fails with the "not approved yet"
   message. `account_statement`
   was submitted without a Document header: submit `account_statement_pdf`
   (same body, Document header) and delete `account_statement`. After
   approval: test each one to the owner's own number (backend released
   2026-10-28), then set `WHATSAPP_REMINDERS_ENABLED=true` on production
   only.
   Server memory: ~954 MB RAM, only ~320–440 MB available and ~1 GB of swap
   already in use with all hosted apps running. One send at a time is fine;
   any bulk/automatic sending must be queued (one Chromium at a time) or move
   to a bigger server (every send starts its own Chromium).
4. **WhatsApp automation plan** (agreed 2026-10-28): 17 steps, built one at a
   time — status and open decisions in WHATSAPP_AUTOMATION_PLAN.md.
5. **WhatsApp bot — on production since 2026-10-28** with its own number
   +91 96859 03733 (webhook override → `prod-api`, bot enabled there). The
   first number +91 97550 63737 stays on the dev server (the app's callback
   URL → `dev-api`) for tests with dev data; real customers must be given the
   production number (INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp bot webhook").
   The dev server sends from a real number, so its `.env` must set
   `WHATSAPP_ALLOWED_RECIPIENTS` (set on the dev server 2026-10-28 with three
   test numbers; checked by the owner: a listed number gets the menu, another
   number gets the "test number" reply). First production test
   ("hi" from a number saved on a production customer): pending. Still to
   verify with real data on a phone: the list menu (pending amount, orders,
   invoices → PDF, payment history, statement PDF, our items). No admin
   screen for the `whatsapp_messages` log yet.
6. **Web hosting details unknown** — see INFRASTRUCTURE_AND_DEPLOY.md §3. Owner
   to record host, branches and build process.
7. **Not tested on physical devices**: the customer ledger (2026-10-04) and
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
9. Creating or editing a tender with a title longer than 200 characters (or
   a tender no. / work order no. longer than 100) fails with "Internal server
   error": Prisma `P2000`, `tenders.title` is `VARCHAR(200)` and the app's
   form has no limit. Seen in the production log (code from before
   2026-09-18). Fix: a clear 400 message, or wider columns (additive
   migration).

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
- Current web hosting (see A.6).
- Should vendor work costs feed a vendor payable / profit report later?
