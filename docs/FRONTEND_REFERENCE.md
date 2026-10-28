# Frontend Reference — `rajat_crm_native_frontend`

Expo SDK 54 + React Native 0.81 + TypeScript + Expo Router 6 + Zustand +
Axios. One codebase ships to Android (primary), iOS and web
(react-native-web). Project-wide context is in `docs/shared/` (start with
`docs/shared/README.md`). UI rules: `docs/FRONTEND_UI_RULES.md`.

Last verified against the code: 2026-10-22.

## 1. Bootstrap and configuration

| File | Purpose |
|---|---|
| `package.json` | `"main": "expo-router/entry"`; scripts below |
| `app.config.js` | Dynamic Expo config (replaces app.json). `EAS_BUILD_PROFILE=production` → "Rajat CRM", package `com.rajatelectricals.crm`, navy icon, scheme `crm`; anything else → "(Dev) Rajat CRM", `com.rajatelectricals.crm.dev`, copper icon, scheme `crm-dev` |
| `eas.json` | EAS profiles `development`, `preview` (dev API), `production` (prod API); each sets `EXPO_PUBLIC_API_URL`; Android builds are APKs |
| `constants/api.ts` | `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'` |
| `.env` (git-ignored) | Local `EXPO_PUBLIC_API_URL` |

Scripts: `npm start` (expo start), `npm run android`, `npm run ios`,
`npm run web`, `npm run build:web` (`expo export --platform web` → `dist/`),
`npm run verify` (`scripts/verify.js`, identical copy of the backend's:
done-checks for both repos — tsc baseline, docs, rules, backend API tests;
docs/shared/LOCAL_DEV_AND_TESTING.md §4).
APK builds: `APK_BUILDS.md` and docs/shared/INFRASTRUCTURE_AND_DEPLOY.md.

`EXPO_PUBLIC_*` values are inlined at build time — never put secrets in them.

## 2. Folder structure

```
app/                               Expo Router (file-based routes)
  _layout.tsx                      root: gesture handler, status bar, auth initialize()
  index.tsx                        auth gate → /(app) or /(auth)/login (waits for isInitialized)
  (auth)/login.tsx
  (app)/
    _layout.tsx                    Tabs: index (Home), work, people, inventory, finance; web shows WebTopNav instead of a tab bar
                                   hidden stacks (href: null): tenders, projects, customers, vendors, employees,
                                   orders, invoices, purchases, estimates, gst, hr, vehicles, maintenance, admin, ledger
    index.tsx                      dashboard (KPIs, calendar, revenue chart, recents)
    work.tsx / people.tsx / finance.tsx   hub screens (cards filtered by permission)
    <module>/_layout.tsx           Stack + useFeatureGuard('<key>') + HubBackButton on index
    <module>/index.tsx             list   (most modules)
    <module>/[id].tsx              detail
    hr/                            index, attendance, employee-attendance, salary-components,
                                   salary-payments, incentives, epf-esic
    inventory/                     index, [id], stock (stock ledger)
    ledger/                        index (Receivables report), [id] (customer ledger/statement)
    admin/                         index, users, groups (super admin)
components/                        form sheets, pickers, shared UI (table below)
services/api.ts                    axios instance + every API object + all TypeScript types
store/                             auth.ts (user/token, userHasFeature), recents.ts, payrollMonth.ts
hooks/                             useFeatureGuard.ts, useMediaUpload.ts
constants/                         api.ts, colors.ts, moduleHubs.ts (breadcrumb/back targets), stackOptions.ts
utils/                             storage.ts, dialogs.ts, invoiceHtml.ts, ledgerHtml.ts, ledgerFormat.ts, printHtml.ts,
                                   whatsappSend.ts (confirm + send + result for every WhatsApp template button)
docs/                              this file, FRONTEND_UI_RULES.md, shared/ (mirrored project docs)
```

### Hubs (what each tab shows)

| Hub | Cards (permission key) |
|---|---|
| Work | Tenders (`tenders`), Projects (`projects`), Vehicles (`vehicles`), Maintenance & FD (`maintenance`) |
| People | Customers, Vendors, Employees, HR (`hr` and sub-keys) |
| Inventory tab | Inventory (`inventory`) / Stock (`stock`); tab hidden without either |
| Finance | Orders, Invoices, Purchases, Estimates, GST, Stock, Receivables (`ledger`) |
| Home | Dashboard; revenue card needs `revenue`; calendar needs a calendar key |

## 3. State, auth and permissions

- `store/auth.ts` (Zustand): `user`, `token`, `isInitialized`, `login()`,
  `logout()`, `initialize()`. Token key `auth_token` in `utils/storage.ts`
  (web `localStorage`, native `expo-secure-store`). The key is used in
  `store/auth.ts`, `services/api.ts` and `hooks/useMediaUpload.ts` — never
  rename it.
- `userHasFeature(user, key)`: superuser → true; permissions missing → true;
  exact key or any `key.*` child → true.
- `useFeatureGuard(...keys)`: in every module `_layout.tsx`; redirects to Home
  when the user has none of the keys; also records the module in
  `store/recents.ts` (Home "Recently visited").
- `store/payrollMonth.ts`: payroll month shared by the salary screens (clamped
  to the current month).
- On a web deep link the user can arrive after the first render — effects that
  depend on permissions must list the permission in their dependencies
  (see `customers/[id].tsx` ledger fetch).

## 4. API layer (`services/api.ts`)

Axios instance (`timeout 15000`, JSON) with a request interceptor that adds
`Authorization: Bearer <token>`. 401s are not intercepted globally.

Every API object and function, its URL, the backend handler it reaches and
the app files that call it are in the GENERATED `docs/shared/CODE_MAP.md`
§2–4 (search e.g. `ordersApi.addPayment`; `npm run map`). Section 7 there
lists functions with no backend route and functions nothing calls.

Types for every request/response live at the bottom of `services/api.ts`.
They are maintained by hand — update them whenever the backend shape changes.

## 5. Components

| Component | Purpose |
|---|---|
| `OrderFormSheet` | Order create/edit. Separate web (dialog + items table) and native (full-screen cards) layouts. Customer/project/inventory/vendor pickers, rental days, optional "also create invoice + GST", Vendor Work section |
| `InvoiceFormSheet` | Invoice create/edit; `presetOrderId` prefills from an order ("Make Invoice") |
| `EstimateFormSheet`, `PurchaseFormSheet`, `GstFormSheet`, `TenderFormSheet`, `ProjectFormSheet`, `CustomerFormSheet`, `VendorFormSheet`, `EmployeeFormSheet`, `InventoryFormSheet`, `StockEntryFormSheet`, `StockMovementSheet` | Create/edit forms per module |
| `PaymentFormSheet` | Add/edit one order payment |
| `ReceiptFormSheet` | Ledger "Receive Payment": lump sum spread over unpaid orders (auto oldest first or manual) |
| `LedgerEntrySheet` | Ledger adjustments (discount / write-off / charge / refund) and opening balance |
| `LedgerSheetFrame` | Shared web-dialog / native-modal shell for the two ledger sheets |
| `SalaryComponentFormSheet`, `SalaryPaymentSheet`, `AttendanceEditSheet` | HR forms |
| `UserFormSheet`, `GroupFormSheet` | Admin |
| `SearchPickerModal`, `DatePickerModal`, `MonthYearPickerModal` | Custom pickers (no native selects). `OrderFormSheet` has its own inline SearchPickerModal |
| `MediaSection`, `CameraUploadSheet` | Attachments on detail screens (upload via `useMediaUpload`, XHR) |
| `RevenueChart`, `DashboardCalendar`, `ModuleCard` | Dashboard widgets and presentational module card |
| `WebTopNav`, `WebHubPage`, `Breadcrumbs`, `HubBackButton`, `CustomerFilterBanner` | Navigation / layout helpers |

## 6. Printing and PDFs

- Invoice: `utils/invoiceHtml.ts` builds standalone HTML on the client's
  letterhead (`COMPANY` constants). The backend copy `src/utils/invoicePdf.ts`
  must stay identical in design.
- Customer statement: `utils/ledgerHtml.ts` (reuses `COMPANY`, `esc`, icons).
- Output: `utils/printHtml.ts` — web opens the HTML as its own blob tab
  (expo-print on web ignores the HTML and would print the app), native renders
  a PDF with `expo-print` and opens the share sheet. `invoices/[id].tsx` has
  the same logic inline.

## 7. Media upload

`hooks/useMediaUpload(entity, entityId)` → `POST /api/media/upload` with
`XMLHttpRequest` (NOT axios: its JSON content type breaks multer). Images are
compressed first with `expo-image-manipulator` (max 1920 px, JPEG 80%); PDFs
and Office files go as-is. Web appends a Blob, native appends
`{ uri, name, type }`. Entities: `tender`, `order`, `invoice`, `inventory`.

## 8. Design system (`constants/colors.ts`)

Navy + orange palette: `primary #232F3E` (headers), `accent #FF9900`
(primary actions), `background #F2F3F3`, `surface #FFFFFF`, `border #D5D9D9`,
text `#0F1111 / #565959 / #8D9397`, `success #067D62`, `error #D13212`,
`info #0073BB`, plus `*Light` variants and `kpi1..6`; `whatsapp #25D366`
only for WhatsApp buttons and icons. Use the tokens; do not hard-code new
colours without a reason.

## 9. Layout patterns

- Module stack: `_layout.tsx` (Stack, `STACK_SCREEN_OPTIONS`, feature guard),
  `index.tsx` (search, pills, FlatList, pull to refresh, FAB), `[id].tsx`
  (header card, stats row, sections, form sheets).
- Web vs native: check `Platform.OS === 'web'` branches and width checks
  (`useWindowDimensions`) before changing a screen; forms often have two JSX
  trees.
- Navigation: `router.push('/(app)/orders/' + id as any)` — dynamic routes need
  the `as any` cast. Detail screens opened from another module's stack may
  have no native back button (ledger `[id]` has a fallback).
- Alerts: use `utils/dialogs.ts` on code paths that run on web.
- WhatsApp sends: always through `confirmAndSendWhatsapp` (`utils/whatsappSend.ts`)
  — it shows the number, blocks double taps and reports the server's message.
  Offers right after saving wait `AFTER_SHEET_MS` so the dialog is not lost
  while the sheet closes (iOS). The order screen offers the confirmation when
  opened with `?offerWhatsapp=1` (set by the orders list after "New order").

## 10. Gotchas

- `npx tsc --noEmit` shows a known baseline of errors (outlineStyle pattern,
  count in docs/shared/KNOWN_ISSUES_AND_PENDING.md). Do not raise it.
- `npx expo start` with `CI=1` does not watch files — restart after edits.
- Android: do not set `KeyboardAvoidingView` `behavior` (Android uses
  `adjustResize`); iOS uses `padding`.
- `StatusBar style="light"` is global.
- `app/index.tsx` waits for `isInitialized` — never remove that guard.
