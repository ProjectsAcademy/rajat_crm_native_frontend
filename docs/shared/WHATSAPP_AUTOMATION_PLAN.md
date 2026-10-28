# WhatsApp Automation Plan

Agreed with the owner on 2026-10-28: every step below is wanted; they are built
one at a time, in this order. **Before starting a step, read its section,
settle its open decisions with the owner, and set its status to "in progress".
When it is done, set "done (date, commits)" and add a WORK_LOG entry.**
Business rules that a finished step creates move to FEATURES.md; this file
keeps only the plan and the status.

Already live before this plan (FEATURES.md "WhatsApp messages to customers"
and "WhatsApp self-service bot"): invoice PDF, order confirmation, payment
received, payment reminder (manual + automatic), statement PDF, the customer
menu bot with "Our items".

## Status

| Step | What | Side | Status |
|---|---|---|---|
| 0.1 | Release to production; move the bot to production | both | in progress (production backup taken 2026-10-28) |
| 0.2 | Switch RBAC from shadow mode to enforced | both | waiting for the owner |
| 0.3 | Staff WhatsApp identity (`users.phone`) | client | not started |
| 0.4 | Customer opt-out (STOP / START) | customer | done (2026-10-28, backend `063e79d`, app `20a79e6`) |
| 1.1 | Owner daily summary + alerts | client | not started — template needed |
| 1.2 | Order status updates | customer | not started — template needed |
| 1.3 | Event reminder the day before | customer | not started — template needed |
| 2.1 | Online payment link with automatic ledger entry | customer | not started — gateway to choose |
| 2.2 | Payment screenshot → one-tap verify | customer + client | not started |
| 3.1 | Delivery team: list, "Delivered", site photos | client | not started — template needed |
| 3.2 | Staff quick lookups (balance, order, stock) | client | not started |
| 3.3 | Staff payment entry with PIN | client | not started |
| 4.1 | Booking enquiry from the bot | customer | not started |
| 4.2 | Estimate PDF with an "Accept" button | customer | not started — template needed |
| 4.3 | Pickup request and feedback after delivery | customer | not started — template needed |
| 5.1 | Attendance from WhatsApp | client | not started |
| 5.2 | Owner approvals (big purchase, discount, write-off) | client | not started — template needed |

## Rules for every step (security)

1. **Customer side reads, or makes requests a person approves.** A customer's
   message never changes amounts, phone numbers, addresses or prices.
2. **Identity = the sender's WhatsApp number**, verified by Meta, on a
   signature-checked webhook (already in place). It must match a customer's
   saved phone (customer side) or an active app user's `phone` (client side,
   step 0.3) — otherwise no data at all.
3. **Staff get the same permissions as in the app** (`userHasFeature` rules,
   server side). Step 0.2 must be done before any staff step that writes.
4. **Anything that moves money or stock from WhatsApp** needs a PIN (hashed,
   locked after 3 wrong tries), a confirm button, a copy to the owner and a log
   row. No free-text amounts without a confirm step.
5. **Buttons and lists only — no free-text AI deciding anything.** Every id
   that comes back from WhatsApp is re-checked on the server (as the invoice
   list already does), so a crafted message cannot reach someone else's data.
6. **Automatic messages:** only to customers who have not opted out (step
   0.4), only between 10:00 and 19:00 IST, logged in `whatsapp_messages`, on
   ONE server (env flag per feature, like `WHATSAPP_REMINDERS_ENABLED`), and
   claimed per day so a second server on a shared database cannot send twice.
7. **Meta limits:** business-initiated messages reach at most 250 different
   people per 24 h (`TIER_250`, rises with good quality). A poor quality rating
   (blocks, reports) lowers the limit — STOP must always work.
8. **Costs:** template messages outside the customer's 24-hour window are
   charged; replies inside it are free. Keep the prepaid balance topped up.
9. **Templates:** Utility category, language `en`, no variable at the very
   start or end of the text, texts and variable order recorded here before
   submitting. Submit early — approval can take a day.

## Step details

### 0.1 Release to production and move the bot

- **Why first:** today the real business number is answered by the DEV
  server, which has its own (dev) database — real customers get dev data.
- **Owner actions:** back up the production database (done 2026-10-28,
  INFRASTRUCTURE_AND_DEPLOY.md §4); release backend first (merge `dev_01` →
  `main`, run the production deploy; the five pending migrations are listed
  in KNOWN_ISSUES A.1, all additive), then the app.
  Production `.env`: the `WHATSAPP_*` values, `WHATSAPP_BOT_ENABLED=true`
  (and `false` on dev), Chromium installed, `pm2 restart`. Point the Meta
  webhook at `prod-api…` (INFRASTRUCTURE_AND_DEPLOY.md "WhatsApp bot
  webhook"). Test "hi" from the owner's phone.
- **Done when:** the bot answers from production and dev answers nothing.

### 0.2 RBAC enforced

- **Owner actions:** give every real user a group in Admin, watch
  `[rbac-shadow]` lines in `pm2 logs` for a few days, then
  `RBAC_ENFORCE=true` (KNOWN_ISSUES A.2). `RBAC_STRICT=true` only when no
  user relies on legacy access.
- **Done when:** production runs with `RBAC_ENFORCE=true`.

### 0.3 Staff WhatsApp identity

- **Build:** `users.phone` (additive column, unique when set), field in Admin
  → Users; the bot recognises an active user's number before checking
  customers and answers with a staff menu (empty until step 1.1 / 3.2 fill it).
  A number saved on both a user and a customer gets the staff menu.
- **Decisions to settle:** which staff get a number first (owner only?).
- **Done when:** the owner's number gets the staff menu; a deactivated
  user's number gets the "not registered" answer.

### 0.4 Customer opt-out

- **Build:** `customers.whatsapp_opt_out_at`; a customer who writes STOP (or
  UNSUBSCRIBE) is opted out of all automatic messages and gets a confirmation;
  START opts back in. The automatic reminder scheduler and every later
  automatic sender skip opted-out customers; manual sends from the app still
  work but the confirm dialog says the customer opted out. The customer
  ledger/profile shows the state.
- **Decisions:** defaults above, taken 2026-10-28; staff cannot change the
  opt-out in the app (only the customer, by STOP / START); automatic
  reminders cannot be switched on while a customer is opted out.
- **Done:** 2026-10-28 — `test/whatsapp-opt-out.test.ts`; rules now in
  FEATURES.md "WhatsApp messages to customers".

### 1.1 Owner daily summary and alerts

- **Build:** at a fixed time a `daily_summary` template to the owner (and to
  users chosen in Admin): date, collected today, new orders, deliveries
  tomorrow, items needing attention. Replying opens the 24-hour window, so the
  details are free messages: low stock (`inventory.reorder_level`), vehicle
  insurance / permit / fitness expiring in 15 days, FD alerts, tenders
  closing in 7 days, estimates expiring in 3 days, failed WhatsApp sends,
  Meta payment errors (131042). "REPORT" from a staff number answers the same
  any time.
- **Template `daily_summary`** (Utility, en):
  "Daily summary for {{1}} from the Rajat Electricals CRM: collected Rs.
  {{2}}, new orders {{3}}, deliveries tomorrow {{4}}, items that need
  attention {{5}}. Reply MENU to see the details."
  Samples: `28/10/2026` · `45,000.00` · `3` · `2` · `4`.
- **Decisions to settle:** time (suggestion 8:00 PM), who receives it.

### 1.2 Order status updates

- **Build:** when staff change an order's status to confirmed, ready or
  delivered (and only then), the customer gets `order_status`; each status
  once per order; not for opted-out customers; per-order "don't notify"
  switch in the order form.
- **Template `order_status`** (Utility, en):
  "Hello {{1}}, here is an update on your order {{2}} with RAJAT Electric
  Decoration & Power Point: {{3}}. For any help please call 8839032230.
  Thank you."
  Samples: `Ramesh Sharma` · `ORD-OCT26-0012` · `it is ready for delivery`.
- **Decisions to settle:** which statuses notify (suggestion: confirmed,
  ready, delivered).

### 1.3 Event reminder the day before

- **Build:** at 10:00 IST the day before an order's date, `event_reminder`
  to its customer (not cancelled / delivered orders, not opted out, once per
  order).
- **Template `event_reminder`** (Utility, en):
  "Hello {{1}}, this is a reminder from RAJAT Electric Decoration & Power
  Point that your event for order {{2}} is on {{3}}. Our team will reach the
  venue as planned. For any change please call 8839032230. Thank you."
  Samples: `Ramesh Sharma` · `ORD-OCT26-0012` · `29/10/2026`.

### 2.1 Online payment link with automatic ledger entry

- **Build:** a payment link (gateway API) for the balance due, sent in a
  template with a URL button; the gateway's signed webhook creates the
  ledger receipt (oldest dues first, as "Receive Payment" does) and sends
  `payment_received` — no person involved. Amount and customer come from our
  own link record, never from the webhook text alone; each gateway payment id
  is recorded once.
- **Decisions to settle:** gateway (Razorpay or Cashfree; the business needs
  an account with KYC; per-transaction fee), link expiry, partial payments.
- **Template:** written once the gateway is chosen (the URL button format
  depends on it).

### 2.2 Payment screenshot → one-tap verify

- **Build:** a customer's image in the bot → stored (MinIO) as a "payment
  proof" waiting for verification; staff see it in the app (and step 1.1's
  alerts) and enter the receipt with one tap, which sends `payment_received`.
  Never automatic: screenshots can be faked.

### 3.1 Delivery team

- **Build:** drivers (users with a phone, or `vehicles.driver_phone`) get
  tomorrow's deliveries with addresses and a Maps link; a "Delivered" button
  per order sets the status (which triggers 1.2); photos sent in reply are
  stored as order attachments. A driver sees only orders assigned to him or
  her (an order → vehicle/driver field is part of this step).
- **Template `delivery_schedule`** (Utility, en), written when the step
  starts.

### 3.2 Staff quick lookups

- **Build:** staff menu: customer balance, order status, item stock — lists
  and buttons, read-only, permission-checked (`ledger`, `orders`,
  `inventory`).

### 3.3 Staff payment entry with PIN

- **Build:** staff menu → customer → amount (typed, then confirmed) → mode →
  PIN → receipt + `payment_received`; the owner gets a copy of every entry.
  Needs `ledger` permission and step 0.2.

### 4.1 Booking enquiry

- **Build:** customer menu "Book / Enquire": event date, place, items from
  "Our items", notes → an Enquiry record in the app (new small module) and an
  alert to staff. Orders are still created by a person.

### 4.2 Estimate PDF with "Accept"

- **Build:** estimate PDF in a template with quick-reply buttons Accept /
  Call me. Accept (only by that customer's number, before `valid_until`, once)
  creates a pending order from the estimate and alerts staff.
- **Template `estimate_share`**, written when the step starts.

### 4.3 Pickup request and feedback

- **Build:** after delivery, the menu offers "Request pickup" (calendar entry
  + staff alert); a feedback question with 1–5 buttons is stored per order.
- **Template `feedback_request`**, written when the step starts (Meta may
  class surveys as Marketing — check before submitting).

### 5.1 Attendance from WhatsApp

- **Build:** employees (`employees.phone`) send IN / OUT with live location →
  draft attendance rows that a supervisor approves in the app (location can
  be faked, so never final on its own).

### 5.2 Owner approvals

- **Build:** purchases above a limit, discounts and write-offs wait for the
  owner's Approve / Reject buttons; the app shows "waiting for approval".
- **Template `approval_request`**, written when the step starts.
