# Features — Business Rules and Design Decisions

What each module does, the rules it enforces, and WHY. When you change a
module, update its section here in the same task.

## Orders (`/api/orders`, Finance → Orders)

- Statuses: `pending`, `confirmed`, `in_progress`, `ready`, `delivered`,
  `cancelled`. Payment status (`pending` / `partial` / `paid`) is derived.
- `orderDate` is the **event date** (shown as "Event Date" on invoices);
  `deliveryDate` is optional.
- Items: inventory item (optional) + description, quantity, unit price,
  `isRental`, `rentalDays`. Line total = qty × price × days (days = 1 when not
  rental). `totalAmount = subtotal`; there is no tax on orders.
- Orders do **not** move stock (rentals go out and come back). Only purchases,
  manual stock entries and inventory opening stock create `stocks` rows.
- Payments: `POST/PUT /api/orders/:id/payments`; after any change
  `recalcOrderPaid()` recomputes `paidAmount` and `paymentStatus` from the
  payment rows. There is no endpoint to delete a single payment.
- Payments created by a ledger **receipt** (`receipt_id` set) are locked: the
  order screen shows them with a lock icon and "Part of receipt RCT-...", and
  the API refuses to edit them. Changing an order's customer is refused while
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
- WhatsApp (manual only — decided with the owner 2026-10-27; no automatic
  sending anywhere): the "WhatsApp" button on a sales invoice that has a
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

- Codes auto-generate (`CUST001`, `VEND001`) when left blank.
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
