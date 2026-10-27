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
3. **WhatsApp invoice sending** (manual button) — status as of 2026-10-27:
   Meta setup done (IDs in INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp Business
   (Meta) setup"): number +91 97550 63737 verified and on `CLOUD_API`,
   permanent system-user token created, template `invoice_share` resubmitted
   in the correct WhatsApp Business Account and under review. Still to do:
   add a payment method to the WhatsApp Business Account; on each server
   checkout (dev first) set the `WHATSAPP_*` values in `.env`, run `npx
   playwright install --with-deps chromium` once, restart pm2; after
   approval, test-send to the owner's own number. The server has ~1 GB RAM and
   every send starts Chromium — fine for occasional manual sends, not for bulk
   sending.
4. **Web hosting details unknown** — see INFRASTRUCTURE_AND_DEPLOY.md §3. Owner
   to record host, branches and build process.
5. **Not tested on physical devices**: the customer ledger (2026-10-04) and
   vendor work (2026-10-22) were tested on web (desktop and 390 px width)
   with synthetic data only.

## B. Tech debt and real bugs (not fixed yet)

1. `purchases.ts` numbers purchases with `count()+1` (`PUR-MMMYY-NNN`) — can
   collide after deletes (same bug class fixed for orders/invoices/estimates
   on 2026-09-12). Customer/vendor codes (`CUST`/`VEND` + count+1) have the same
   weakness (a clash returns HTTP 400 "code already exists").
2. Invoice number generation exists twice: `nextInvoiceNo` (invoices.ts) and
   `nextInvoiceNoTx` (orders.ts). Keep identical or merge into one helper.
3. Invoice PDF template exists twice (frontend `utils/invoiceHtml.ts`, backend
   `src/utils/invoicePdf.ts`). Must be kept in sync by hand.
4. `cors({ origin: '*' })` — open CORS; consider restricting to the app
   origins.
5. No automated tests in either repository. Verification is manual
   (LOCAL_DEV_AND_TESTING.md).
6. Detail screens opened from another module's stack (for example an order
   opened from a customer) may have no back button on native; the ledger
   detail screen has a fallback back button, other modules do not.
7. `WebTopNav` overflows horizontally when the web app is used at phone width.
8. Orders: a payment row cannot be deleted from the UI or API (only edited).

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
