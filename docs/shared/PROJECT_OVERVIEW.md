# Project Overview

## What this is

A custom CRM / business-management system for **Rajat Electricals**
("RAJAT Electric Decoration & Power Point", Indore, Madhya Pradesh, India).
The business is an 'A' class electrical contractor that:

- rents out event lighting, decoration, trussing, chandeliers, gensets,
  cooling and similar equipment for weddings, gardens, tent houses and events
  (most day-to-day orders are these rentals), and
- takes electrical contracting work, including government tenders
  (for example municipal street lighting).

The system replaced an older Django application. The database still carries
Django-era conventions (snake_case tables, Django PBKDF2 password hashes in
`users`), which is why some of those details must never change.

The client uses it daily from a browser (web build) and from Android phones
(APK). All prices are in Indian Rupees (₹); dates are shown as DD/MM/YYYY;
the financial year is April to March.

## The two repositories

| Repo | Stack | Purpose |
|---|---|---|
| `rajat_crm_node_backend` | Node.js 22, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase), MinIO (S3) | REST API at `/api/*`, business logic, database, file storage, PDFs, deploy workflow |
| `rajat_crm_native_frontend` | Expo SDK 54, React Native 0.81, Expo Router, TypeScript, Zustand, Axios | One codebase that ships as an Android app (APK), an iOS build, and a web app |

Both live in the GitHub organisation `ProjectsAcademy` and use the same two
branches:

| Branch | Meaning |
|---|---|
| `dev_01` | Development. All work is committed here first. |
| `main` | Production. Only updated by merging `dev_01` (pull request), then deployed manually. |

The frontend talks to the backend only over HTTPS JSON (`Authorization:
Bearer <JWT>`). There is no shared code package between the repos; types are
duplicated by hand in `rajat_crm_native_frontend/services/api.ts`.

## Environments

| | Development | Production |
|---|---|---|
| API | `https://dev-api.urjaradiant.com` (backend `dev_01`) | `https://prod-api.urjaradiant.com` (backend `main`) |
| Web app | `dev-crm.urjaradiant.com` (seen in use; hosting details: see INFRASTRUCTURE_AND_DEPLOY.md) | not recorded yet — owner to fill in |
| Android app | "(Dev) Rajat CRM", package `com.rajatelectricals.crm.dev` | "Rajat CRM", package `com.rajatelectricals.crm` |
| Backend deploy | automatic on every push to `dev_01` | manual "Run workflow" on `main` |

Details: [INFRASTRUCTURE_AND_DEPLOY.md](INFRASTRUCTURE_AND_DEPLOY.md).

## Modules (what users see)

The app has five tabs: **Home** (dashboard), **Work**, **People**,
**Inventory**, **Finance**. The hubs open module screens:

| Hub | Modules |
|---|---|
| Home | KPI cards, calendar (events), revenue chart with Collected / Outstanding by customer, recently visited modules |
| Work | Tenders, Projects, Vehicles, Maintenance & FD alerts |
| People | Customers, Vendors, Employees, HR & Payroll (attendance, salary components, salary payments, incentives, EPF/ESIC) |
| Inventory | Inventory items, Stock ledger |
| Finance | Orders, Invoices, Purchases, Estimates, GST records, Stock, Receivables (customer ledger) |
| Admin (super admin only) | Users, Groups & Permissions |

Every module is permission-gated (RBAC, see ARCHITECTURE.md).

## Core business flow (the 80% case)

1. A customer books an event → an **Order** is created (customer, optional
   project, event date = order date, rental items × days, optional third-party
   **Vendor Work**).
2. Money received is recorded as **payments on the order**, or as a lump-sum
   **Receipt** from the customer ledger that is spread over the oldest unpaid
   orders.
3. If the customer needs a bill, an **Invoice** is made from the order
   ("Make Invoice"), printed/shared as PDF (or sent on WhatsApp once Meta
   setup is done).
4. The **Customer Ledger** (khata) shows everything billed, received, adjusted
   and the running balance; **Receivables** shows all customers' dues with
   ageing.

## Glossary

| Term | Meaning |
|---|---|
| Khata / ledger | The customer's account statement (debits, credits, running balance) |
| Baaki / outstanding / due | Money the customer still owes |
| Advance | Money received that is not yet adjusted against any order (a credit balance) |
| Event date | The order's `orderDate` (the day the event/work happens) |
| Dr / Cr | Debit (customer owes more) / Credit (customer owes less or has advance) |
| FY | Indian financial year, 1 April – 31 March |
| Vendor work | Part of an order done by a third party (subcontractor / supplier) |
| Rental days | Number of days an item is rented; line total = qty × unit price × days |
| Legacy access | `users.is_legacy_access` — a user who keeps full access while RBAC is rolled out |

The developer and the client often talk in Hinglish (Hindi + English). All
code, UI text and documentation must still be in English — see RULES.md.
