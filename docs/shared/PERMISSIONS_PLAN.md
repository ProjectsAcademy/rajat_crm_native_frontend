# Permissions Plan — fine-grained access (policies)

Written 2026-10-29 at the owner's request, for the client's wish: "control
every action inside a module, like AWS / Azure policies". **Direction agreed
with the client (2026-10-29): full freedom** — the client creates any roles
and groups themselves and sets any permission (view / create / edit /
delete and every other action) later, all from the super admin account in
Admin, as today. So the system ships the mechanism and the catalog, not
fixed roles. §10 records what that settles and the defaults for the rest.
Before starting a phase, settle
its open decisions with the owner, set its status to "in progress", and
when done set "done (date, commits)" and add a WORK_LOG entry. Rules that a
finished phase creates move to ARCHITECTURE.md "Permissions (RBAC)"; this file
keeps the plan and the status.

## Status

| Phase | What | Side | Status |
|---|---|---|---|
| P0 | Today's RBAC enforced (module keys + readers) | both | in progress — WHATSAPP_AUTOMATION_PLAN.md step 0.2 |
| P1 | Action catalog, policy engine, an action on every endpoint | backend | not started |
| P2 | Roles and groups (Azure-like) + Admin editors, deny, effective access | both | not started |
| P3 | App: every button and menu follows the actions | app | not started |
| P4 | Audit log and its viewer | both | not started |
| P5 | Conditions: own records, amount limits, edit window, status locks | both | not started — client decisions |
| P6 | Hidden fields (cost, salary, balances) | both | not started — client decisions |

## 1. Today and the gap

Today (ARCHITECTURE.md "Permissions (RBAC)"): one key per module (`orders`,
`invoices`, ...; HR has sub-keys, the calendar three tiers). The key gives
**everything** in that module: an `invoices` user can list, open, create,
edit, delete, print, share and send invoices on WhatsApp, and upload or
delete their files. The app hides whole modules, not buttons.

The client wants:

1. Per module: **view, create, edit, delete** separately.
2. Per action inside a module: for example the invoice's WhatsApp button
   hidden for some users, print allowed but not delete, payments entry
   without editing the order.
3. Room to grow "like AWS / Azure": exceptions per user, explicit denies,
   rules such as "only their own records" or "discounts up to ₹2,000".

## 2. What we take from AWS IAM and Azure RBAC

| Idea | AWS IAM | Azure RBAC | Here |
|---|---|---|---|
| Named actions | `s3:GetObject` | `Microsoft.Storage/.../read` | `invoices.whatsapp`, `orders.payments.add` |
| Wildcards | `s3:*` | `*/read` | a parent key covers its children: `orders` = every `orders.*` (already how `hr` covers `hr.attendance`) |
| Roles | policies attached to groups / users | roles assigned to groups / users | **roles** (permission sets) assigned to **groups** or directly to **users** (§4) |
| Explicit deny wins | yes | deny assignments | yes: deny on a user or any of their groups beats every allow |
| Default deny | yes | yes | yes (implicit deny) |
| Conditions | `Condition` blocks | ABAC conditions | a fixed menu (§5): own records, amount limit, edit window, status lock |
| Built-in roles | managed policies | built-in roles | none fixed — the client builds every role; "copy role" (§7) |
| Simulator | policy simulator | "check access" | "Effective access" per user and "Can X do Y?" (§7) |
| Activity log | CloudTrail | activity log | audit log (§6) |

**Not taken:** free-form JSON policies typed by hand. The client's admins are
not technical, and one typo in a JSON policy silently opens or closes a
module. The matrix (§7) writes the same data; JSON is only for export /
import (copying roles from dev to production).

## 3. Action catalog (draft — confirm with the client)

Every action is a key `module.action` (sub-resources `module.sub.action`).
Standard actions: `view`, `create`, `edit`, `delete`. The catalog lives in
code (it replaces the list in `src/lib/features.ts`); the database stores
only grants. **Today's keys stay as parents**, so existing groups keep
exactly the access they have now (P1 changes nothing for users).

| Module | Standard | More actions |
|---|---|---|
| customers | view, create, edit, delete (deactivate) | — (opening balance is in ledger) |
| vendors | view, create, edit, delete | — |
| employees | view, create, edit, deactivate, delete (permanent) | — |
| tenders | view, create, edit, delete | files.upload, files.delete |
| projects | view, create, edit, delete | — |
| orders | view, create, edit, delete | status (change status, cancel), payments.view, payments.add, payments.edit, payments.delete, whatsapp (order confirmation), payments.whatsapp (payment received), vendor-work (see and edit vendor costs), files.upload, files.delete |
| invoices | view, create, edit, delete | status, print (print, PDF, share), whatsapp, files.upload, files.delete |
| estimates | view, create, edit, delete | — |
| purchases | view, create, edit, delete | stock-entries (stock entries of a purchase) |
| gst | view, create, edit, delete | — |
| inventory | view, create, edit, deactivate, delete (permanent) | files.upload, files.delete, whatsapp-listing ("Show on WhatsApp" switch) |
| stock | view, create, edit, delete | — |
| ledger | view (receivables, customer ledger) | receipts.add, receipts.delete, entries.add (discount, write-off, charge, refund), entries.edit, entries.delete, opening-balance, reminders (automatic reminder settings), whatsapp (reminder, statement, receipt / payment message), print (statement) |
| hr.attendance | view, create, edit, delete | — |
| hr.salary-components | view, create, edit, delete | payroll.view |
| hr.salary-payments | view, create, edit, delete | — |
| hr.incentives | view, create | — |
| hr.epf-esic | view, create | — |
| vehicles, maintenance | view | — |
| calendar | unchanged: `calendar`, `calendar-write`, `calendar-manage` | — |
| revenue (Home chart) | unchanged | — |
| admin | super admin only (not delegable in this plan) | — |

About 110 keys. Picker reads stay as today's readers (ARCHITECTURE.md),
but tied to actions: anyone who may `orders.create` or `orders.edit` may
read the customer, item, project and vendor lists for the form.

Deletes of money records (payments, receipts, ledger entries, invoices) are
separate keys on purpose: the usual setup is "many may add, only the owner
may delete".

## 4. Roles, groups and users (P2) — and how a request is decided

Today a group is both a set of people and a set of permissions. The client
wants to build both freely, so they become two things, as in Azure:

- **Role** = a named set of permissions: for every action Allow or Deny,
  optionally with conditions (§5). Examples the client might build:
  "Invoice clerk", "No deletes", "Read only".
- **Group** = a named set of users ("Office staff", "Site team"), with the
  roles assigned to it.
- **User** = member of any groups, plus roles assigned directly (one person's
  exception = a role assigned to that user, for example a role that denies
  `invoices.delete`).

**Data (all additive migrations):**

- `roles` (name, description, active), `role_permissions` (role, key,
  `effect` allow / deny, `conditions` JSON or null).
- `group_roles` (group, role) and `user_roles` (user, role).
- `groups` and `user_groups` stay as they are.
- Migration of today's data, with no change in anyone's access: every
  existing group gets a role with the same name and the same keys, assigned
  to that group. `group_permissions` is then no longer read (kept until the
  next cleanup, for rollback).

**Decision order** — one function, `authorize(user, action, record?)`, used
by every route and by `/api/auth/me`. A user's roles = roles assigned
directly + roles of their active groups (active roles only):

1. inactive user → deny
2. super admin → allow (cannot be limited; at least one stays active)
3. an explicit **deny** in any of the user's roles covering the action (a
   deny on `invoices` covers every `invoices.*`) → deny
4. an **allow** covering the action whose conditions pass → allow
5. legacy access and `RBAC_STRICT` not `true` → allow
6. otherwise → deny

Shadow mode stays: with `RBAC_ENFORCE` off, step 6 logs
`[rbac-shadow] deny <user> -> <action>` and allows, per action, so each phase
can be watched before it is enforced.

Only super admins manage users, groups and roles (as today; the client's
wish). Making that delegable would be a later decision.

## 5. Conditions (P5 — options the client sets on a permission)

The client sets them in the role editor on any allow that supports them; the
system offers this fixed menu (no free-text rules):

| Condition | Example | Needs |
|---|---|---|
| Own records only | an order taker edits only orders they created | `created_by_id` on orders, invoices, estimates, purchases, receipts, ledger entries, order payments, GST, stock (additive; old rows null = owner / admin only) |
| Amount limit | discount or write-off up to ₹2,000; payment entry up to ₹50,000 | the amount in the request |
| Edit window | edit or delete only within N days of creation | `createdAt` |
| Status lock | no edit after an invoice is paid or cancelled; no order edit after delivered | the record's status |
| Later: project scope | only records of assigned projects | an assignment table |

The handler passes the record to `authorize()` and answers with a clear
message ("You can edit only orders you created", "Discounts above Rs.
2,000 need the owner"). A later option instead of a plain refusal: ask the
owner to approve on WhatsApp (WHATSAPP_AUTOMATION_PLAN.md step 5.2).

## 6. Hidden fields (P6) and audit log (P4)

**Hidden fields** are catalog keys too (`inventory.fields.purchase-rate`,
`orders.fields.vendor-cost`, `employees.fields.salary`,
`customers.fields.balance`, ...), so the client allows or denies them per
role like any action. The server leaves the value out of the answer; the
app shows "—".

**Audit log:**

New `audit_logs`: time, user, action key, entity, id, a short summary
(before → after for money and status), device / IP. Recorded: logins,
permission / group / user changes, every delete, money writes (payments,
receipts, ledger entries, salary payments), status changes, WhatsApp sends
(already in `whatsapp_messages`, linked). Viewer under Admin with filters
(user, module, date). Retention to decide (§10).

## 7. Admin screens (P2)

All under Admin, super admin only, as today.

- **Roles:** create, edit, copy, deactivate, delete. The editor is a matrix:
  rows = modules by hub; columns View · Create · Edit · Delete · "More"
  (expands that module's other actions and hidden fields). Each cell: not
  set / Allow / Deny; the row's first cell is the parent key ("everything
  in this module"). Conditions (P5) through a small settings button on an
  allowed cell. Search by action name.
- **Groups:** create, edit, delete; members; roles assigned.
- **Users:** groups, roles assigned directly, and an **Effective access**
  tab: per module what the user can do and where it comes from ("role
  Invoice clerk via group Office staff", "denied by role No deletes").
- **Can X do Y?:** a user and an action (optionally a record) → allowed or
  not, and why.
- **Export / import** roles and groups as JSON, to copy them from dev to
  production.
- No fixed roles are shipped: the client builds them (with "copy role" to
  start from an existing one).
- Changes apply within 60 s on the server (existing cache); the app reloads
  the user's actions when it comes back to the foreground, so nobody has to
  log out and in again.

## 8. App changes (P3)

- `can(action)` (and a `<Can action=...>` wrapper) replaces
  `userHasFeature` for buttons; `useFeatureGuard` uses the module's `view`.
- Screen by screen, web and native layouts both (RULES: separate layouts):
  New (+) buttons, edit, delete, status pickers, payments sections,
  WhatsApp buttons, print / share, file upload / delete, the "Show on
  WhatsApp" switch, vendor-work cost columns. The list comes from CODE_MAP
  §3–4 plus a search for these buttons; a checklist per screen goes into
  the WORK_LOG entry.
- **Hidden, not greyed out** (owner's example: the WhatsApp button should
  not be visible). The server still refuses, so an old APK that shows a
  button gets a clear "You do not have permission to …" message.

## 9. Backend changes (P1)

- `src/lib/permissions-catalog.ts`: the action tree with labels, hub,
  parent, and picker readers.
- `authorize()` + `can('<action>')` middleware on **every** route (no more
  one key per router); handlers call `authorize()` with the record where
  P5 conditions apply.
- `/api/auth/me` returns the effective actions (parents expanded, like
  today's `permissions`).
- `npm run verify` fails when a route has no action; CODE_MAP shows each
  endpoint's action; the cross-permission audit used on 2026-10-29 (screen
  calls vs. their guard) becomes part of verify.
- Tests generated from the catalog: for every endpoint, a user with only its
  action is allowed and a user without it gets 403; deny beats allow; a
  parent covers its children; conditions (P5).

## 10. Client decisions

Client's answer (2026-10-29): **full freedom** — they create roles and
groups themselves and set any permission later, from the super admin account.
What that settles, and the defaults for what it does not:

| # | Question | Answer |
|---|---|---|
| 1 | Which roles? | The client builds them; none are shipped |
| 2 | Who may delete money records? | The client sets it per role (`*.delete` keys) |
| 3 | Own records only? | A condition the client sets per permission (P5) |
| 4 | Amount limits? | A condition the client sets per permission (P5) |
| 5 | Edit locks? | Conditions the client sets (edit window, status lock — P5) |
| 6 | Hidden fields? | Catalog keys the client allows / denies per role (P6) |
| 7 | Per-user exceptions? | Yes — roles assigned directly to a user |
| 8 | Hide or grey out buttons? | Default: hide (owner's WhatsApp example); open |
| 9 | Audit log: what, how long, who sees it? | Default: everything in §6, kept 2 years, super admins only; open |
| 10 | Approvals instead of refusals? | Later (WHATSAPP_AUTOMATION_PLAN.md step 5.2) |

## 11. Order, rollout and risks

**Order:** P0 → P1 → P2 → P3 (the client sees CRUD and button control) → P4
→ P5 → P6. P1 alone changes nothing visible; P2 + P3 deliver the request.
Release P0 to production before P1 lands on `dev_01` (the owner releases
from that branch), so production gets the readers fix on its own.

**Rollout of every phase:** dev in shadow mode → dev enforced with test
cases per role (as on 2026-10-29) → backend to production → app release →
production enforced. Backend first, as always.

**Risks:**

- Full freedom means more room for admin mistakes → effective access, "Can
  X do Y?", deny-wins shown in the matrix, "copy role", the audit log of
  permission changes, and super admins who cannot be limited.
- A route or button forgotten → verify fails on routes without an action;
  generated tests; the screen-call audit.
- Old APKs show buttons the server refuses → clear messages; release the app
  soon after the backend.
- Locking everyone out → super admins cannot be limited; at least one stays
  active (already enforced).
- Staff on WhatsApp are employees, not app users (WHATSAPP_AUTOMATION_PLAN.md
  rule 3): their WhatsApp options are decided per step there, not by this
  catalog, unless a later decision links an employee to a user.
