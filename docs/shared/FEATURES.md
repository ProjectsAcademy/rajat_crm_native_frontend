# Features — Business Rules and Design Decisions

What each module does, the rules it enforces, and WHY. When you change a
module, update its section here in the same task.

## Orders (`/api/orders`, Finance → Orders)

- Statuses: `pending`, `confirmed`, `in_progress`, `ready`, `delivered`,
  `cancelled`. Payment status (`pending` / `partial` / `paid`) is derived.
- WhatsApp order confirmation and payment receipts (offered after saving,
  buttons on the order screen): "WhatsApp messages to customers".
- `orderDate` is the **event date** (shown as "Event Date" on invoices);
  `deliveryDate` is optional.
- Items: inventory item (optional) + description, quantity, unit price,
  `isRental`, `rentalDays`. Line total = qty × price × days (days = 1 when not
  rental). `totalAmount = subtotal`; there is no tax on orders.
- Orders do **not** move stock (rentals go out and come back). Only purchases,
  manual stock entries and inventory opening stock create `stocks` rows.
- Payments: `POST/PUT/DELETE /api/orders/:id/payments`; after any change
  `recalcOrderPaid()` recomputes `paidAmount` and `paymentStatus` from the
  payment rows. A payment saved by mistake is removed with **Delete Payment**
  in its edit sheet (confirm dialog shows amount, mode and date; added
  2026-10-27 at the client's request — before that a wrong payment could only
  be edited, never removed). The customer ledger follows automatically
  because it is computed from the payment rows.
- List: 20 orders per page with Prev / Next (newest first; ties on
  `createdAt` ordered by id). Search and the customer filter run on the
  server over all orders and always restart at page 1.
- Payments created by a ledger **receipt** (`receipt_id` set) are locked: the
  order screen shows them with a lock icon and "Part of receipt RCT-...", and
  the API refuses to edit or delete them (delete the receipt in the customer
  ledger instead). Changing an order's customer is refused while
  such payments exist.
- **Make Invoice** (order screen) opens a new invoice prefilled from the order.
  The order form can also "Also create an invoice" at creation time, which
  additionally creates a `GstRecord`.
- **Vendor Work** (added 2026-10-22): rows of vendor + work description +
  amount (cost to us, optional). Sent as `vendorWorks` on create/update
  (update replaces the whole list; omitting the field leaves it unchanged).
  Shown on the order detail screen with the total vendor cost, and on the
  vendor's profile as "Order Work". Record only — not in the customer ledger
  or any profit calculation yet. Vendors with recorded work cannot be deleted.

## Customer Ledger and Receivables (`/api/ledger`, permission `ledger`)

Built 2026-10-04 at the client's request to "manage the customer ledger
professionally". Decisions confirmed with the owner:

- **Debit side = orders only** (not cancelled). Invoices are not counted
  (most are made from orders; counting both double-bills).
- Opening balance per customer (`customers.opening_balance`, signed, with an
  optional date; no date = before everything).
- Adjustments (`customer_ledger_entries`): `discount` and `write_off` (Cr),
  `charge` and `refund` (Dr).
- **Receive Payment**: one lump sum (`customer_receipts`, number
  `RCT-MMMYY-NNNN`) spread over the customer's unpaid orders oldest first, or
  by amounts the user edits; the rest stays as advance. It creates
  `order_payments` rows linked by `receipt_id`, so each order's paid status
  stays correct. Receipts cannot be edited — delete and re-enter. Deleting a
  receipt removes its order payments and recomputes those orders.
- Statement: date-range filter (default current FY), opening balance brought
  forward, running balance, totals, closing balance; printable "Statement of
  Account" PDF on the invoice letterhead (`utils/ledgerHtml.ts`).
- Ageing (0–30, 31–60, 61–90, 90+ days) is **bill-wise**: each order's own
  unpaid part is aged from its order date; credits not tied to an order
  (advance, discounts, write-offs, Cr opening, overpayments, money on cancelled
  orders) are applied to the oldest dues first. Future-dated orders count as
  0–30. Buckets always add up to the balance when the customer owes money.
- Receivables report: every customer with a non-zero balance (or all), sorted
  by balance; Finance hub card shows count and total due; dashboard
  "Outstanding/Collected by Customer" rows open the customer's ledger.
- One-time data fix in migration `20261004120000_customer_ledger`: orders whose
  `paid_amount` had no payment rows (imported data, 11 orders / ₹3,27,500 in
  the database checked) got one payment row dated on the order date with the
  note "Imported balance (actual payment date not recorded)".
- WhatsApp from the ledger screen: Send Reminder, WhatsApp Statement, a
  WhatsApp icon on payment and receipt lines, and the automatic reminder
  setting — see "WhatsApp messages to customers".
- Implementation: `src/lib/ledger.ts` (pure calculation, integer paise),
  `src/routes/ledger.ts`; frontend `app/(app)/ledger/*`,
  `components/ReceiptFormSheet.tsx`, `components/LedgerEntrySheet.tsx`.

## Invoices (`/api/invoices`, Finance → Invoices)

- Types: `sales` (customer) or `purchase` (vendor). Statuses: `draft`, `sent`,
  `paid`, `overdue`, `cancelled` (status is set by hand; there are no invoice
  payments).
- Items have their own qty/price/tax rate (default 18%) and optional inventory
  link. Discount (`discountEnabled`, `discountPercent`) applies to
  subtotal + tax; `totalAmount` is the final payable amount.
- Optional link to the order it was made from; then the invoice shows Order
  No., Event Date (order date), Delivery date and Project — on screen, in the
  printed invoice and in the WhatsApp PDF.
- Printed layout copies the client's paper bill book (letterhead constants in
  `utils/invoiceHtml.ts`, `COMPANY`). A second copy of the template is
  `src/utils/invoicePdf.ts` in the backend — keep them identical.
- WhatsApp (manual — decided with the owner 2026-10-27; the only automatic
  WhatsApp message is the payment reminder, see "WhatsApp messages to
  customers"): the "WhatsApp" button on a sales invoice that has a
  customer sends the invoice PDF to the phone number saved in that customer's
  profile, after a confirm dialog that shows the number. Each message costs
  money and cannot be recalled.
  - Flow: `POST /api/invoices/:id/send-whatsapp` → checks the customer phone
    (Indian mobile, 10 digits or 91 + 10) → checks WhatsApp is configured →
    renders the PDF (`src/utils/invoicePdf.ts`, Playwright Chromium) → uploads
    it to Meta → sends template `invoice_share` (language `en`, Document
    header, body variables: customer name, invoice no., total "11,800.00",
    due date "DD/MM/YYYY").
  - Template text submitted to Meta (category Utility): "Hello {{1}}, please
    find attached your invoice {{2}} for Rs. {{3}}, due on {{4}}. Thank you
    for choosing RAJAT Electric Decoration & Power Point."
  - Errors are explained in plain language (missing phone → 400, server not
    configured → 503, common Meta codes such as 190 token, 132001 template,
    131042 payment are mapped in `src/lib/whatsapp.ts`).
  - The app waits up to 60 s for this call (`invoicesApi.sendWhatsapp`) — the
    default 15 s could report a failure for a message that was actually sent
    and invite a duplicate (charged) send.
- Standalone invoices do not create GST records; only the order form's "Also
  create an invoice" path does.

## Estimates (`/api/estimates`)

Number `EST-MMMYY-NNNN`, items with optional inventory link, discount like
invoices, optional link to an order.

## Customers and Vendors

- Codes auto-generate when left blank: customers get one past the highest
  existing `CUSTnnn` (fixed 2026-10-27 — it used to be count+1, which broke
  after a delete); vendors still use `VEND` + count+1 (KNOWN_ISSUES B.1).
- Customer delete is blocked while it has orders, invoices, estimates, ledger
  receipts or adjustments. Vendor delete is blocked while it has purchases,
  invoices or order vendor work. "Deactivate" (`isActive=false`) is the normal
  way to retire a record.
- Customer profile shows the ledger balance (when the user has `ledger`) and
  related records with counts; vendor profile shows Order Work.

## Inventory, Stock and Purchases

- `inventory` is the item master; current stock is never stored, it is the sum
  of `stocks` movements (`direction` in/out; `transactionType` such as
  `purchase_in`, `purchase_reversal`, `adjustment_in/out`, `opening_balance`).
- Purchases stock their items (`purchase_in`) and track `stockedQty` per item
  so edits only move the difference; deleting/reducing reverses it
  (`purchase_reversal`). Free-text purchase items can auto-create inventory
  entries.
- Purchase number `PUR-MMMYY-NNN` still uses `count()+1` (see KNOWN_ISSUES).

## HR and Payroll (People → HR)

- Sub-permissions: `hr.attendance`, `hr.salary-components`,
  `hr.salary-payments`, `hr.incentives`, `hr.epf-esic` (granting `hr` grants
  all).
- Attendance: status `P`/`A`/`H`/`L`, hours and overtime, unique per
  employee + project + date; daily marking, bulk marking, monthly and yearly
  summaries.
- Salary payments are a **ledger**: several installments per employee per
  month are allowed; the API prevents paying more than the
  attendance-computed net payable.
- EPF/ESIC records are unique per employee per month.

## WhatsApp messages to customers (templates)

Built 2026-10-28; decisions (owner, same day): order confirmation and payment
receipt are offered right after saving and can be sent again from a button;
payment reminders run automatically per customer and can also be sent by
hand; the statement goes as a PDF.

Every message uses an approved Utility template (WhatsApp Manager, language
`en`), goes to the phone saved in the customer's profile (Indian mobile, as
for invoices), is logged in `whatsapp_messages` (`kind` =
`template:<name>`), and is charged by Meta when sent outside the customer's
24-hour window. Apart from automatic reminders, nothing is sent until a person
confirms a dialog that shows the number (`utils/whatsappSend.ts` in the app;
a second tap while a send is running is ignored). Senders and variable order:
`src/lib/customerMessages.ts`; template names: `TEMPLATES` in
`src/lib/whatsapp.ts`.

| Template | Header | Variables, in order | Sent from |
|---|---|---|---|
| `invoice_share` | invoice PDF | name, invoice no., total, due date | Invoice screen → WhatsApp (see Invoices) |
| `order_confirmation` | none | name, order no., order (event) date, order amount, advance received (paid so far) | Order screen → WhatsApp; offered after "New order" |
| `payment_received` | none | name, amount, date, "UPI, ref UTR123", customer balance after it ("Rs. 34,000.00 due" / "Rs. 500.00 advance" / "nil") | WhatsApp icon on an order payment and on ledger payment/receipt lines; offered after "Add Payment" and "Receive Payment" |
| `payment_reminder` | statement PDF, all time | name, total billed, paid and adjusted, balance due, last payment ("Rs. 20,000.00 on 04/10/2026" / "none yet") | Ledger → Send Reminder (only when something is due); automatic reminders |
| `account_statement_pdf` | statement PDF of the period shown | name, period ("01/04/2026 to 31/03/2027"), closing balance | Ledger → WhatsApp Statement |

- Template texts (body):
  - `order_confirmation`: "Hello {{1}}, your order {{2}} with RAJAT Electric
    Decoration & Power Point is confirmed for {{3}}. Order amount: Rs. {{4}}.
    Advance received: Rs. {{5}}. For any changes please call 8839032230.
    Thank you."
  - `payment_received`: "Hello {{1}}, we have received your payment of Rs.
    {{2}} on {{3}} ({{4}}). Your account balance with RAJAT Electric
    Decoration & Power Point is now {{5}}. Thank you for your payment."
  - `payment_reminder`: "Hello {{1}}, this is a payment reminder from RAJAT
    Electric Decoration & Power Point. / Total billed: Rs. {{2}} / Paid and
    adjusted: Rs. {{3}} / Balance due: Rs. {{4}} / Last payment: {{5}} / Your
    full statement with every order and payment is attached. Please clear the
    balance at the earliest. Thank you." (each " / " is a line break)
  - `account_statement_pdf`: "Hello {{1}}, please find attached your account
    statement from RAJAT Electricals for {{2}}. Closing balance: {{3}}. Thank
    you."
- The template `account_statement` (submitted 2026-10-27 without a Document
  header) is not used: its text says "attached" but it cannot carry a PDF.
- Reminder numbers are the ledger's (all ledger debits / credits, the same as
  the bot's "Pending amount"), so billed − paid = balance and they match the
  attached statement.
- A payment that is a slice of a lump-sum receipt is not sent on its own
  (400): the customer paid the receipt, which is sent from the ledger.
  Cancelled orders get no confirmation; every other status can be confirmed
  (an order is a booking).
- **Automatic payment reminders** (`src/lib/paymentReminders.ts`, table
  `payment_reminders`):
  - Switched on per customer in the ledger screen card "Automatic Payment
    Reminder": Off / every 7 / 15 / 30 days. Needs a valid mobile number.
  - Run only on the server with `WHATSAPP_REMINDERS_ENABLED=true` (ONE
    server). Every 10 minutes between 10:00 and 19:00 IST: a customer is due
    on the day reminders are switched on, then `everyDays` after the last
    reminder (a manual "Send Reminder" restarts the cycle). Sent only when at
    least ₹500 is due. One customer at a time (each PDF starts Chromium).
  - A customer is claimed for the day (`checked_on`) before sending, so a
    second server on a shared database, or an overlapping run, cannot send
    twice. Skipped (less than ₹500 due, no phone) and failed sends are tried
    again the next day; the card shows the next date and the last skip/failure.
  - The card warns when the server does not send automatically.

## WhatsApp self-service bot (`/api/whatsapp/webhook`)

Built 2026-10-27. Decisions (owner): Phase 1 inside this backend (not n8n),
menu with data options only — no "talk to us" option; no AI/LLM.

- A customer writes anything to the business number → reply with a WhatsApp
  **list message** (one "Menu" button, five rows). Every answer ends with the
  menu again. Options (the first three since 2026-10-27, invoices and payment
  history added the same day at the owner's choice):
  - Pending amount: per customer — total billed (all ledger debits), paid and
    adjusted (all credits), balance due / advance, last payment (amount +
    date), "unpaid since" (oldest due date). Same numbers as the ledger.
  - My orders: latest 5 orders — number, event date, status, amount, paid,
    due.
  - My invoices: a second list with the latest 10 sales invoices (not
    cancelled; drafts included, because the client rarely changes invoice
    status) — invoice no., date, total. Picking one sends that invoice's PDF
    (same `renderInvoicePdf` as the manual send) as a free-form document,
    caption "Invoice X — Rs. total, due date". The row id `INV:<id>` comes
    back from WhatsApp, so the bot re-checks that the invoice belongs to the
    sender's customers before sending.
  - Payment history: the last 10 ledger credits of type payment / receipt,
    newest first (date, amount, receipt no., mode and reference), plus
    "Total received". The "Imported balance" note of migrated payments is
    left out.
  - Statement PDF: current financial year statement, rendered on the server
    (`src/utils/statementPdf.ts`) and sent as a document with the closing
    balance in the caption.
  - Row ids `PENDING`, `ORDERS`, `STATEMENT` are the same as the old
    three-button menu, so taps on old messages still work.
- Identity: the sender's WhatsApp number must match a customer's saved phone
  (`normalizeIndianMobile`, so `9000000001` and `+91 90000 00001` both match).
  If several customers share the number, each is shown, skipping the ones with
  no ledger activity. Unknown numbers get one fixed message per 24 h with the
  business phone numbers, and no data.
- Replies are normal (non-template) messages inside the 24-hour customer
  service window, so no template approval is needed and Meta does not charge
  for them.
- Cost rules (Meta per-message pricing, checked 2026-10-27 — confirm current
  rates on Meta's pricing page before quoting the client):
  - Each customer message opens (or restarts) a 24-hour window. Inside it,
    free-form messages (all bot replies, including PDFs) are free.
  - Utility templates (`invoice_share`, a future `payment_reminder`) are
    free when sent inside an open window and charged per message outside it.
    So a manual invoice send right after the customer used the bot costs
    nothing; the same send two days later is charged.
  - Marketing templates are charged always, window or not.
  - Outside a window only templates can be sent (free-form fails with Meta
    code 131047).
- Safety: webhook signature (`WHATSAPP_APP_SECRET`) is mandatory; messages for
  other phone numbers on the app (Meta's test number) are ignored; retried
  webhooks are answered once (`whatsapp_messages.wa_message_id` unique);
  messages are processed one at a time; `WHATSAPP_BOT_ENABLED` must be `true`
  on exactly one server.
- Log: every message in and out (including invoice sends) is a row in
  `whatsapp_messages` with delivery status (sent / delivered / read / failed).
  No screen shows it yet.

## Dashboard and Calendar

- KPI counts per module (`GET /api/dashboard`, any logged-in user).
- Revenue chart, Collected / Outstanding totals and per-customer breakdowns
  need the `revenue` permission. Tapping a customer in a breakdown opens their
  ledger (or profile without `ledger`).
- Calendar events have three independent permission tiers: `calendar` (view),
  `calendar-write` (create/edit own), `calendar-manage` (edit anyone's).

## Tenders, Projects, Vehicles, Maintenance

- Tender → Projects (a project may come from a tender). Tenders and projects
  have full CRUD.
- Vehicles and maintenance / FD alerts: the API is read-only (GET only).

## Admin (super admin only)

Users (create, edit, activate, groups, legacy-access flag, password in Django
format) and Groups (feature permissions matrix built from `features.ts`). The
last active super admin cannot be removed.
