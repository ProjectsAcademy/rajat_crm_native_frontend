# Rules — Read Before You Change Anything

These rules exist because breaking them has already caused outages, data
problems or lost work in this project. They are not style preferences.
If a task seems to require breaking one, stop and ask the owner first.

## 1. Process rules (every task)

1. **Read first.** Before writing code: `AGENTS.md`, this file,
   `KNOWN_ISSUES_AND_PENDING.md`, and the docs for the area you touch.
2. **Work on `dev_01` only.** Never commit to `main`. Production changes go
   `dev_01` → pull request → `main` → manual production deploy (see
   INFRASTRUCTURE_AND_DEPLOY.md).
3. **Never rewrite git history.** No `git commit --amend`, `rebase`,
   `reset` of existing commits, or `push --force`. The owner pushes from the
   same checkout, so a commit that looks local may already be on GitHub.
   Fix mistakes with a new commit.
4. **Document every change** following
   [DOCUMENTATION_PROTOCOL.md](DOCUMENTATION_PROTOCOL.md). Undocumented work
   is unfinished work.
5. **English only in the project.** UI labels, placeholders, error messages,
   code comments, commit messages and docs are English. Hindi/Hinglish is fine
   in conversation with the owner, never in files.
6. **Find the root cause before fixing.** Read the code path, reproduce, then
   make the smallest correct change. Do not stack guesses.
7. **Verify before claiming done.** Backend: `npx tsc --noEmit` exits 0.
   Frontend: `npx tsc --noEmit` error count does not go above the known
   baseline (see KNOWN_ISSUES). Exercise the change (see
   LOCAL_DEV_AND_TESTING.md). Say clearly what you did NOT test.
8. **Ask before** anything irreversible or outward-facing: deleting data,
   running migrations against a real database, deploying to production,
   sending WhatsApp messages, changing server files.

## 2. Database and data

1. **Never run Prisma CLI commands against the real database by accident.**
   `prisma migrate ...` uses `DIRECT_URL` (not only `DATABASE_URL`). The
   backend `.env` points at the remote Supabase database. For local work,
   override BOTH: `DATABASE_URL=<local> DIRECT_URL=<local> npx prisma ...`.
2. **Never use `prisma db push`** on any shared database. Schema changes are
   always migrations in `prisma/migrations/`, applied by `prisma migrate
   deploy` during deploy.
3. **Migrations must be additive and backward compatible** (new tables,
   nullable/defaulted columns). Development and production may share ONE
   Supabase database — a migration deployed to dev can hit production data
   immediately while production still runs older code.
4. **Never edit a migration that has been committed/applied.** Add a new one.
5. **Never copy real customer data** (names, phones, addresses, amounts) out
   of the database into local files or test databases. Test with synthetic
   data.
6. **Never commit secrets.** `.env` files are git-ignored. Do not paste
   tokens, passwords, connection strings or private keys into code or docs.
7. **Read-only investigation queries** against the real database are
   acceptable only when necessary, with `connection_limit=1`.

## 3. Backend code

1. **One shared PrismaClient.** Always `import prisma from '../lib/prisma'`.
   Never `new PrismaClient()` anywhere else. Twenty-two separate clients
   exhausted Supabase's 15-connection pooler and took dev AND prod down on
   2026-09-16. This fix was once reverted by mistake — do not revert it.
2. **Every new route file** uses `router.use(requireAuth,
   requirePermission('<feature-key>'))`, and every new feature key is added
   to `src/lib/features.ts` (the Admin UI reads that list).
3. **Passwords stay Django PBKDF2** (`src/utils/django_password.ts`). Never
   switch to bcrypt/argon2.
4. **Keep `BigInt.prototype.toJSON`** at the top of `src/app.ts` (media file
   sizes are BigInt).
5. **Document numbers** (orders, invoices, estimates, receipts) use the
   month-prefix max lookup (`ORD-OCT26-0001`), never `count() + 1`.
6. **Order payments**: `paidAmount`/`paymentStatus` on an order are derived
   from its `order_payments` rows. Always recompute with
   `recalcOrderPaid()` (`src/lib/ledger.ts`) after changing payments.
7. **Payments that belong to a customer receipt** (`receipt_id` set) are
   changed only through the receipt in the ledger. Do not add code paths that
   edit them individually.
8. **The invoice and statement templates exist twice** — frontend
   `utils/invoiceHtml.ts` / `utils/ledgerHtml.ts` and backend
   `src/utils/invoicePdf.ts` / `src/utils/statementPdf.ts`. Change both
   together. Render PDFs only through `renderHtmlToPdf()` (one Chromium at a
   time on a ~1 GB server).
9. **Do not modify `update.sh` in git** without the owner. The server
   checkouts carry local edits to it; changing the tracked file makes
   `git pull` on the server conflict and breaks automatic deploys.
10. **WhatsApp webhook**: keep `/api/whatsapp/webhook` mounted before
   `express.json()` and never skip the signature check. Production and dev
   use DIFFERENT WhatsApp numbers; each server answers only the number in its
   `WHATSAPP_PHONE_NUMBER_ID` — never put the production number's ID in a
   dev `.env`. A test server (dev) sets `WHATSAPP_ALLOWED_RECIPIENTS`;
   production leaves it empty. Bot replies must never reveal data to a number that does not
   match the customer's saved phone. `WHATSAPP_REMINDERS_ENABLED=true`
   (automatic payment reminders, each one charged) also on ONE server only.
   Never send a WhatsApp message to a customer automatically except these
   reminders, which a person switched on for that customer.

## 4. Frontend code

1. **Check both layouts.** Many screens and forms have separate web and
   native layouts (for example `OrderFormSheet.tsx`). Any UI change must work
   on web (wide and phone-width) and native (Android first, iOS).
2. **Web TextInputs** get `...Platform.select({ web: { outlineStyle: 'none' } })`.
   This pattern causes the known baseline of TypeScript errors — follow it,
   do not "fix" it.
3. **No native browser `<select>` dropdowns.** Use the custom pickers
   (`SearchPickerModal`, `DatePickerModal`, `MonthYearPickerModal`).
4. **Non-auth inputs** use `autoComplete="off"` (search fields
   `"new-password"`), `textContentType="none"`, `importantForAutofill="no"`.
   Login fields keep real autofill.
5. **Permission-gate UI** with `userHasFeature(user, key)` and module layouts
   with `useFeatureGuard(key)`. The backend is the real enforcement.
6. **Alerts/confirms on web**: React Native Web's `Alert.alert` does nothing.
   Use `utils/dialogs.ts` (`notify`, `confirmAsync`) or a `Platform.OS ===
   'web'` branch with `window.alert/confirm`.
7. **Dates**: send ISO `YYYY-MM-DD` to the API; show DD/MM/YYYY or
   "04 Oct 2026". Parse ISO dates by hand where a timezone shift would change
   the day.
8. The full UI rule set is in `rajat_crm_native_frontend/docs/FRONTEND_UI_RULES.md`.

## 5. Business rules that must not be broken silently

1. **Customer ledger debit = orders only** (not cancelled). Invoices are not
   counted, because most invoices are made from orders and counting both
   would bill the customer twice. Decided with the owner on 2026-10-04.
2. Ledger amounts are summed in **integer paise**, converted to rupees only at
   the API edge.
3. A cancelled order is not a debit, but money paid on it stays as a credit
   (the customer has an advance / refund due).
4. Receipts are spread over unpaid orders **oldest first**; the remainder is
   advance.
5. Vendor work amounts are a record of cost to the business; they are not part
   of the customer ledger.
