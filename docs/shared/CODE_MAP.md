# Code Map (generated — do not edit by hand)

Built from the code of both repositories by `npm run map`
(`scripts/code-map.js`); `npm run verify` fails when it is out of date, so
it can be trusted. **Search it, do not read it whole**: look up a module,
endpoint, screen, component or model, then open only the file:line it
names. `(w)` = the handler writes that table. "Used by" = app files that
call the endpoint through `services/api.ts`.

Sections: 1 Modules · 2 API endpoints · 3 Screens · 4 Components and other
frontend files · 5 Data models · 6 Backend helpers · 7 Loose ends

## 1. Modules

| Module | Mount | Backend file | Permission | Endpoints | App API object | App screens |
|---|---|---|---|---|---|---|
| whatsappWebhook | `/api/whatsapp/webhook` | src/routes/whatsappWebhook.ts | public | 2 | — | — |
| auth | `/api/auth` | src/routes/auth.ts | auth only, public | 3 | authApi | — |
| admin | `/api/admin` | src/routes/admin.ts | super admin | 24 | adminApi | app/(app)/admin/ |
| dashboard | `/api/dashboard` | src/routes/dashboard.ts | auth only, revenue | 4 | dashboardApi | — |
| customers | `/api/customers` | src/routes/customers.ts | customers.create, customers.delete, customers.edit, customers.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, gst.create, gst.edit) | 5 | customersApi | app/(app)/customers/ |
| tenders | `/api/tenders` | src/routes/tenders.ts | tenders.create, tenders.delete, tenders.edit, tenders.view (read also by projects.create, projects.edit) | 5 | tendersApi | app/(app)/tenders/ |
| projects | `/api/projects` | src/routes/projects.ts | projects.create, projects.delete, projects.edit, projects.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit) | 5 | projectsApi | app/(app)/projects/ |
| vendors | `/api/vendors` | src/routes/vendors.ts | vendors.create, vendors.delete, vendors.edit, vendors.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, gst.create, gst.edit, purchases.create, purchases.edit) | 5 | vendorsApi | app/(app)/vendors/ |
| employees | `/api/employees` | src/routes/employees.ts | employees.create, employees.delete, employees.edit, employees.view (read also by hr.salary-components.create, hr.salary-components.edit) | 5 | employeesApi | app/(app)/employees/ |
| inventory | `/api/inventory` | src/routes/inventory.ts | inventory.create, inventory.deactivate, inventory.delete, inventory.edit, inventory.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, purchases.create, purchases.edit, purchases.stock-entries, stock.view, stock.create, stock.edit) | 7 | inventoryApi | app/(app)/inventory/ |
| orders | `/api/orders` | src/routes/orders.ts | orders.create, orders.delete, orders.edit, orders.payments.add, orders.payments.delete, orders.payments.edit, orders.payments.whatsapp, orders.view (read also by invoices.create, invoices.edit, estimates.create, estimates.edit), orders.whatsapp | 10 | ordersApi | app/(app)/orders/ |
| invoices | `/api/invoices` | src/routes/invoices.ts | invoices.create, invoices.delete, invoices.edit, invoices.view, invoices.whatsapp | 6 | invoicesApi | app/(app)/invoices/ |
| purchases | `/api/purchases` | src/routes/purchases.ts | purchases.create, purchases.delete, purchases.edit, purchases.view | 5 | purchasesApi | app/(app)/purchases/ |
| hr | `/api/hr` | src/routes/hr.ts | hr.attendance.create, hr.attendance.delete, hr.attendance.edit, hr.attendance.view, hr.epf-esic.create, hr.epf-esic.view, hr.incentives.create, hr.incentives.view, hr.salary-components.create, hr.salary-components.delete, hr.salary-components.edit, hr.salary-components.payroll, hr.salary-components.view, hr.salary-payments.create, hr.salary-payments.delete, hr.salary-payments.edit, hr.salary-payments.view | 25 | hrApi | app/(app)/hr/ |
| estimates | `/api/estimates` | src/routes/estimates.ts | estimates.create, estimates.delete, estimates.edit, estimates.view | 5 | estimatesApi | app/(app)/estimates/ |
| gst | `/api/gst` | src/routes/gst.ts | gst.create, gst.delete, gst.edit, gst.view | 5 | gstApi | app/(app)/gst/ |
| stock | `/api/stock` | src/routes/stock.ts | stock.create or purchases.stock-entries, stock.delete or purchases.stock-entries, stock.edit or purchases.stock-entries, stock.view (read also by inventory.view, purchases.view) | 4 | stockApi | — |
| vehicles | `/api/vehicles` | src/routes/vehicles.ts | vehicles.view | 2 | vehiclesApi | app/(app)/vehicles/ |
| maintenance | `/api/maintenance` | src/routes/maintenance.ts | maintenance.view | 2 | maintenanceApi | app/(app)/maintenance/ |
| media | `/api/media` | src/routes/media.ts | inventory.files.upload, requireEntityPermission (media.ts:91) | 4 | — | — |
| calendar | `/api/calendar` | src/routes/calendar.ts | calendar or calendar-write or calendar-manage, calendar-write or calendar-manage | 4 | calendarApi | — |
| ledger | `/api/ledger` | src/routes/ledger.ts | ledger.entries.add, ledger.entries.delete, ledger.entries.edit, ledger.opening-balance, ledger.receipts.add, ledger.receipts.delete, ledger.reminders, ledger.view, ledger.whatsapp | 14 | ledgerApi | app/(app)/ledger/ |

## 2. API endpoints

### whatsappWebhook — `/api/whatsapp/webhook` — src/routes/whatsappWebhook.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 26 | public | — | — | not called by the app |
| POST / | 37 | public | — | verifyWebhookSignature, enqueueWebhook | not called by the app |

### auth — `/api/auth` — src/routes/auth.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| POST /login | 17 | public | User (w), UserGroup | verifyDjangoPassword, invalidateUserAccess, getPermissionKeys | authApi.login (api.ts:28) ← store/auth.ts |
| GET /me | 95 | auth only (any check is in the handler) | User, UserGroup | getPermissionKeys | authApi.me (api.ts:30) ← store/auth.ts |
| POST /logout | 133 | auth only (any check is in the handler) | — | — | authApi.logout (api.ts:31) ← store/auth.ts |

### admin — `/api/admin` — src/routes/admin.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /features | 30 | super admin | — | — | adminApi.features (api.ts:37) ← app/(app)/admin/access.tsx, app/(app)/admin/audit.tsx, components/RoleFormSheet.tsx |
| GET /users | 35 | super admin | User | — | adminApi.users.list (api.ts:39) ← app/(app)/admin/access.tsx, app/(app)/admin/audit.tsx, app/(app)/admin/index.tsx, app/(app)/admin/users.tsx, components/GroupFormSheet.tsx |
| POST /users | 46 | super admin | User (w) | hashDjangoPassword, serializeUser | adminApi.users.create (api.ts:40) ← components/UserFormSheet.tsx |
| PUT /users/:id | 93 | super admin | User (w) | hashDjangoPassword, invalidateUserAccess, serializeUser | adminApi.users.update (api.ts:41) ← components/UserFormSheet.tsx |
| PUT /users/:id/groups | 142 | super admin | UserGroup (w), User | invalidateUserAccess, serializeUser | adminApi.users.setGroups (api.ts:43) ← components/UserFormSheet.tsx |
| PUT /users/:id/roles | 170 | super admin | UserRole (w), User | invalidateUserAccess, serializeUser | adminApi.users.setRoles (api.ts:45) ← components/UserFormSheet.tsx |
| GET /users/:id/access | 195 | super admin | User | invalidateUserAccess, getEffectiveAccess, decide | adminApi.users.access (api.ts:47) ← app/(app)/admin/access.tsx |
| DELETE /users/:id | 224 | super admin | User (w) | invalidateUserAccess | adminApi.users.remove (api.ts:48) ← app/(app)/admin/users.tsx |
| GET /roles | 311 | super admin | Role | — | adminApi.roles.list (api.ts:51) ← app/(app)/admin/index.tsx, app/(app)/admin/roles.tsx, components/GroupFormSheet.tsx, components/UserFormSheet.tsx |
| POST /roles | 322 | super admin | Role (w) | serializeRole, readPermissions | adminApi.roles.create (api.ts:52) ← components/RoleFormSheet.tsx |
| PUT /roles/:id | 341 | super admin | Role (w) | invalidateAllAccess, serializeRole | adminApi.roles.update (api.ts:53) ← components/RoleFormSheet.tsx |
| PUT /roles/:id/permissions | 364 | super admin | RolePermission (w), Role | invalidateAllAccess, serializeRole, readPermissions | adminApi.roles.setPermissions (api.ts:55) ← components/RoleFormSheet.tsx |
| POST /roles/:id/copy | 385 | super admin | Role (w) | serializeRole | adminApi.roles.copy (api.ts:57) ← app/(app)/admin/roles.tsx |
| DELETE /roles/:id | 408 | super admin | Role (w), GroupRole, UserRole | invalidateAllAccess | adminApi.roles.remove (api.ts:58) ← app/(app)/admin/roles.tsx |
| GET /groups | 442 | super admin | Group | — | adminApi.groups.list (api.ts:62) ← app/(app)/admin/groups.tsx, app/(app)/admin/index.tsx, components/UserFormSheet.tsx |
| POST /groups | 453 | super admin | Group (w) | invalidateAllAccess, serializeGroup | adminApi.groups.create (api.ts:63) ← components/GroupFormSheet.tsx |
| PUT /groups/:id | 478 | super admin | Group (w) | invalidateAllAccess, serializeGroup | adminApi.groups.update (api.ts:64) ← components/GroupFormSheet.tsx |
| PUT /groups/:id/roles | 503 | super admin | GroupRole (w), Group | invalidateAllAccess, serializeGroup | adminApi.groups.setRoles (api.ts:66) ← components/GroupFormSheet.tsx |
| PUT /groups/:id/members | 525 | super admin | UserGroup (w), Group | invalidateAllAccess, serializeGroup | adminApi.groups.setMembers (api.ts:68) ← components/GroupFormSheet.tsx |
| DELETE /groups/:id | 547 | super admin | Group (w), UserGroup | invalidateAllAccess | adminApi.groups.remove (api.ts:70) ← app/(app)/admin/groups.tsx |
| POST /check | 569 | super admin | User | invalidateUserAccess, getEffectiveAccess, decide | adminApi.check (api.ts:73) ← app/(app)/admin/access.tsx |
| GET /audit | 600 | super admin | AuditLog | — | adminApi.audit (api.ts:75) ← app/(app)/admin/audit.tsx |
| GET /export | 628 | super admin | Group, Role | — | adminApi.exportAll (api.ts:77) ← app/(app)/admin/roles.tsx |
| POST /import | 652 | super admin | Group (w), GroupRole (w), Role (w), RolePermission (w), UserGroup (w), User | invalidateAllAccess, readPermissions | adminApi.importAll (api.ts:78) ← app/(app)/admin/roles.tsx |

### dashboard — `/api/dashboard` — src/routes/dashboard.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 11 | auth only (any check is in the handler) | Customer, Employee, EmployeeAttendance, Estimate, GstRecord, Inventory, Invoice, MaintenancePeriod, Order, OrderPayment, Project, Purchase, SalaryIncentive, SalaryPayment, Stock, Tender, User, Vehicle, Vendor | — | dashboardApi.getSummary (api.ts:94) ← app/(app)/finance.tsx, app/(app)/hr/index.tsx, app/(app)/index.tsx, app/(app)/people.tsx, app/(app)/work.tsx |
| GET /revenue | 93 | revenue | Order | — | dashboardApi.getRevenue (api.ts:95) ← not called |
| GET /collected-by-customer | 174 | revenue | Order | withCustomerNames | dashboardApi.getCollectedByCustomer (api.ts:96) ← not called |
| GET /outstanding-by-customer | 197 | revenue | Order | withCustomerNames | dashboardApi.getOutstandingByCustomer (api.ts:97) ← not called |

### customers — `/api/customers` — src/routes/customers.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 13 | customers.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, gst.create, gst.edit) | Customer | — | customersApi.list (api.ts:103) ← app/(app)/customers/index.tsx, components/EstimateFormSheet.tsx, components/GstFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx |
| GET /:id | 54 | customers.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, gst.create, gst.edit) | Customer | — | customersApi.detail (api.ts:105) ← app/(app)/customers/[id].tsx |
| POST / | 90 | customers.create | Customer (w) | nextCustomerCode | customersApi.create (api.ts:106) ← components/CustomerFormSheet.tsx |
| PUT /:id | 138 | customers.edit · in handler: customers.delete | Customer (w) | ensure | customersApi.update (api.ts:107) ← app/(app)/customers/[id].tsx, components/CustomerFormSheet.tsx |
| DELETE /:id | 173 | customers.delete | Customer (w), CustomerLedgerEntry, CustomerReceipt, Estimate, Invoice, Order | — | customersApi.deactivate (api.ts:109) ← app/(app)/customers/[id].tsx |

### tenders — `/api/tenders` — src/routes/tenders.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 33 | tenders.view (read also by projects.create, projects.edit) | Tender | — | tendersApi.list (api.ts:159) ← app/(app)/tenders/index.tsx, components/ProjectFormSheet.tsx |
| GET /:id | 72 | tenders.view (read also by projects.create, projects.edit) | Tender | — | tendersApi.detail (api.ts:161) ← app/(app)/tenders/[id].tsx |
| POST / | 136 | tenders.create | Tender (w) | parseDateField, validateTenderFields | tendersApi.create (api.ts:162) ← components/TenderFormSheet.tsx |
| PUT /:id | 175 | tenders.edit | Tender (w) | parseDateField, validateTenderFields | tendersApi.update (api.ts:163) ← components/TenderFormSheet.tsx |
| DELETE /:id | 226 | tenders.delete | Tender (w), Project, TenderMedia | deleteFromMinio | tendersApi.remove (api.ts:164) ← app/(app)/tenders/[id].tsx |

### projects — `/api/projects` — src/routes/projects.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 26 | projects.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit) | Project | — | projectsApi.list (api.ts:230) ← app/(app)/projects/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx |
| GET /:id | 63 | projects.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit) | Project | — | projectsApi.detail (api.ts:232) ← app/(app)/projects/[id].tsx |
| POST / | 84 | projects.create | Project (w), Tender | parseDateField | projectsApi.create (api.ts:233) ← components/ProjectFormSheet.tsx |
| PUT /:id | 145 | projects.edit | Project (w), Tender | parseDateField | projectsApi.update (api.ts:234) ← components/ProjectFormSheet.tsx |
| DELETE /:id | 219 | projects.delete | Project (w), Estimate, Invoice, Order | — | projectsApi.remove (api.ts:235) ← app/(app)/projects/[id].tsx |

### vendors — `/api/vendors` — src/routes/vendors.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 13 | vendors.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, gst.create, gst.edit, purchases.create, purchases.edit) | Vendor | — | vendorsApi.list (api.ts:185) ← app/(app)/vendors/index.tsx, components/GstFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx, components/PurchaseFormSheet.tsx |
| GET /:id | 51 | vendors.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, gst.create, gst.edit, purchases.create, purchases.edit) | Vendor | — | vendorsApi.detail (api.ts:187) ← app/(app)/vendors/[id].tsx, components/PurchaseFormSheet.tsx |
| POST / | 76 | vendors.create | Vendor (w) | — | vendorsApi.create (api.ts:188) ← components/VendorFormSheet.tsx |
| PUT /:id | 120 | vendors.edit | Vendor (w) | — | vendorsApi.update (api.ts:189) ← app/(app)/vendors/[id].tsx, components/VendorFormSheet.tsx |
| DELETE /:id | 155 | vendors.delete | Vendor (w), Invoice, OrderVendorWork, Purchase | — | vendorsApi.delete (api.ts:191) ← app/(app)/vendors/[id].tsx |

### employees — `/api/employees` — src/routes/employees.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 23 | employees.view (read also by hr.salary-components.create, hr.salary-components.edit) · in handler: employees.fields.salary | Employee | holds | employeesApi.list (api.ts:207) ← app/(app)/employees/index.tsx, components/SalaryComponentFormSheet.tsx |
| GET /:id | 62 | employees.view (read also by hr.salary-components.create, hr.salary-components.edit) · in handler: employees.fields.salary | Employee | holds, hideSalary | employeesApi.detail (api.ts:209) ← app/(app)/employees/[id].tsx |
| POST / | 78 | employees.create · in handler: employees.fields.salary | Employee (w) | holds, hideSalary | employeesApi.create (api.ts:210) ← components/EmployeeFormSheet.tsx |
| PUT /:id | 133 | employees.edit · in handler: employees.deactivate, employees.fields.salary | Employee (w) | holds, ensure, hideSalary | employeesApi.update (api.ts:211) ← components/EmployeeFormSheet.tsx, employeesApi.deactivate (api.ts:212) ← app/(app)/employees/[id].tsx, employeesApi.reactivate (api.ts:213) ← app/(app)/employees/[id].tsx |
| DELETE /:id | 174 | employees.delete | Employee (w), EpfEsic, SalaryIncentive, SalaryPayment | — | employeesApi.permanentDelete (api.ts:214) ← app/(app)/employees/[id].tsx |

### inventory — `/api/inventory` — src/routes/inventory.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 22 | inventory.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, purchases.create, purchases.edit, purchases.stock-entries, stock.view, stock.create, stock.edit) | Inventory, InventoryMedia, Stock | — | inventoryApi.list (api.ts:170) ← app/(app)/inventory/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx, components/PurchaseFormSheet.tsx, components/StockEntryFormSheet.tsx |
| GET /categories | 101 | inventory.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, purchases.create, purchases.edit, purchases.stock-entries, stock.view, stock.create, stock.edit) | Inventory | — | inventoryApi.categories (api.ts:178) ← components/InventoryFormSheet.tsx |
| GET /:id | 118 | inventory.view (read also by orders.create, orders.edit, invoices.create, invoices.edit, estimates.create, estimates.edit, purchases.create, purchases.edit, purchases.stock-entries, stock.view, stock.create, stock.edit) | Inventory, InventoryMedia, Stock | calcStock | inventoryApi.detail (api.ts:172) ← app/(app)/inventory/[id].tsx, components/StockEntryFormSheet.tsx |
| POST / | 155 | inventory.create | Inventory (w), Stock (w) | — | inventoryApi.create (api.ts:173) ← components/InventoryFormSheet.tsx |
| PUT /:id | 213 | inventory.edit · in handler: inventory.deactivate, inventory.whatsapp-listing | Inventory (w) | ensure | inventoryApi.update (api.ts:174) ← app/(app)/inventory/[id].tsx, components/InventoryFormSheet.tsx |
| DELETE /:id | 249 | inventory.deactivate | Inventory (w), OrderItem | — | inventoryApi.deactivate (api.ts:176) ← app/(app)/inventory/[id].tsx |
| DELETE /:id/permanent | 277 | inventory.delete | Inventory (w), OrderItem, Stock | — | inventoryApi.permanentDelete (api.ts:177) ← app/(app)/inventory/[id].tsx |

### orders — `/api/orders` — src/routes/orders.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 26 | orders.view (read also by invoices.create, invoices.edit, estimates.create, estimates.edit) | Order | — | ordersApi.list (api.ts:277) ← app/(app)/orders/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx |
| GET /:id | 54 | orders.view (read also by invoices.create, invoices.edit, estimates.create, estimates.edit) · in handler: orders.fields.vendor-cost | Order | holds | ordersApi.detail (api.ts:279) ← app/(app)/orders/[id].tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx |
| POST / | 179 | orders.create · in handler: invoices.create, orders.vendor-work, orders.fields.vendor-cost | GstRecord (w), Invoice (w), Order (w) | ensure, calcItemTotals, nextOrderNo, nextInvoiceNoTx, calcInvoiceTotals, readVendorWorks | ordersApi.create (api.ts:280) ← components/OrderFormSheet.tsx |
| PUT /:id | 287 | orders.edit · in handler: orders.edit, orders.status, orders.vendor-work, orders.fields.vendor-cost | Order (w), OrderItem (w), OrderVendorWork (w), OrderPayment | factsOf, ensure, calcItemTotals, readVendorWorks | ordersApi.update (api.ts:281) ← components/OrderFormSheet.tsx |
| DELETE /:id | 375 | orders.delete · in handler: orders.delete | Order (w), OrderItem (w), OrderMedia (w), OrderPayment (w) | deleteFromMinio, factsOf, ensure | ordersApi.remove (api.ts:282) ← app/(app)/orders/[id].tsx |
| POST /:id/payments | 406 | orders.payments.add · in handler: orders.payments.add | OrderPayment (w), Order | recalcOrderPaid, ensure | ordersApi.addPayment (api.ts:283) ← components/PaymentFormSheet.tsx |
| POST /:id/send-whatsapp | 436 | orders.whatsapp | — | sendError, sendOrderConfirmation | ordersApi.sendWhatsapp (api.ts:287) ← app/(app)/orders/[id].tsx |
| POST /:id/payments/:paymentId/send-whatsapp | 447 | orders.payments.whatsapp | — | sendError, sendPaymentReceivedForPayment | ordersApi.sendPaymentWhatsapp (api.ts:289) ← app/(app)/orders/[id].tsx |
| PUT /:id/payments/:paymentId | 459 | orders.payments.edit · in handler: orders.payments.edit | OrderPayment (w) | recalcOrderPaid, factsOf, ensure | ordersApi.updatePayment (api.ts:284) ← components/PaymentFormSheet.tsx |
| DELETE /:id/payments/:paymentId | 499 | orders.payments.delete · in handler: orders.payments.delete | OrderPayment (w) | recalcOrderPaid, factsOf, ensure | ordersApi.removePayment (api.ts:285) ← components/PaymentFormSheet.tsx |

### invoices — `/api/invoices` — src/routes/invoices.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 107 | invoices.view | Invoice | — | invoicesApi.list (api.ts:296) ← app/(app)/invoices/index.tsx |
| GET /:id | 134 | invoices.view | Invoice | — | invoicesApi.detail (api.ts:298) ← app/(app)/invoices/[id].tsx |
| POST /:id/send-whatsapp | 151 | invoices.whatsapp | Invoice | recipientRefusal, whatsappConfigError, normalizeIndianMobile, uploadMedia, sendTemplate, logWhatsapp, renderInvoicePdf | invoicesApi.sendWhatsapp (api.ts:305) ← app/(app)/invoices/[id].tsx |
| POST / | 207 | invoices.create | Invoice (w), Order | nextInvoiceNo, calcItems, invalidDiscountPercentError, applyDiscount, invalidInventoryIdsError | invoicesApi.create (api.ts:299) ← components/InvoiceFormSheet.tsx |
| PUT /:id | 266 | invoices.edit · in handler: invoices.edit, invoices.status | Invoice (w), InvoiceItem (w), Order | factsOf, ensure, calcItems, invalidDiscountPercentError, applyDiscount, invalidInventoryIdsError | invoicesApi.update (api.ts:300) ← components/InvoiceFormSheet.tsx |
| DELETE /:id | 349 | invoices.delete · in handler: invoices.delete | Invoice (w), InvoiceMedia | deleteFromMinio, factsOf, ensure | invoicesApi.remove (api.ts:301) ← app/(app)/invoices/[id].tsx |

### purchases — `/api/purchases` — src/routes/purchases.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 135 | purchases.view | Purchase | — | purchasesApi.list (api.ts:312) ← app/(app)/purchases/index.tsx |
| GET /:id | 159 | purchases.view | Purchase | — | purchasesApi.detail (api.ts:314) ← app/(app)/purchases/[id].tsx |
| POST / | 178 | purchases.create · in handler: purchases.create | Purchase (w) | ensure, calcTotals, derivePaymentStatus, applyStockTransition | purchasesApi.create (api.ts:315) ← components/PurchaseFormSheet.tsx |
| PUT /:id | 246 | purchases.edit · in handler: purchases.edit | Purchase (w), PurchaseItem (w) | factsOf, ensure, calcTotals, derivePaymentStatus, d, applyStockTransition | purchasesApi.update (api.ts:316) ← components/PurchaseFormSheet.tsx |
| DELETE /:id | 377 | purchases.delete · in handler: purchases.delete | Purchase (w) | factsOf, ensure, d, applyStockTransition | purchasesApi.remove (api.ts:317) ← app/(app)/purchases/[id].tsx |

### hr — `/api/hr` — src/routes/hr.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /attendance | 13 | hr.attendance.view | EmployeeAttendance | — | hrApi.attendance.list (api.ts:357) ← app/(app)/hr/attendance.tsx, app/(app)/hr/employee-attendance.tsx |
| POST /attendance | 46 | hr.attendance.create | EmployeeAttendance (w) | — | not called by the app |
| GET /attendance/day | 78 | hr.attendance.view | Employee, EmployeeAttendance | — | hrApi.attendance.day (api.ts:360) ← app/(app)/hr/attendance.tsx |
| POST /attendance/bulk | 98 | hr.attendance.create | EmployeeAttendance (w) | — | hrApi.attendance.bulkMark (api.ts:361) ← app/(app)/hr/attendance.tsx |
| GET /attendance/summary/month | 151 | hr.attendance.view | Employee, EmployeeAttendance | — | hrApi.attendance.monthSummary (api.ts:366) ← app/(app)/hr/attendance.tsx |
| GET /attendance/summary/year | 189 | hr.attendance.view | Employee, EmployeeAttendance | — | hrApi.attendance.yearSummary (api.ts:368) ← app/(app)/hr/employee-attendance.tsx |
| GET /attendance/:id | 222 | hr.attendance.view | EmployeeAttendance | — | hrApi.attendance.detail (api.ts:359) ← not called |
| PUT /attendance/:id | 242 | hr.attendance.edit | EmployeeAttendance (w) | — | hrApi.attendance.update (api.ts:363) ← components/AttendanceEditSheet.tsx |
| DELETE /attendance/:id | 285 | hr.attendance.delete | EmployeeAttendance (w) | — | hrApi.attendance.remove (api.ts:365) ← components/AttendanceEditSheet.tsx |
| GET /salary-components | 300 | hr.salary-components.view | SalaryComponent | — | hrApi.salaryComponents.list (api.ts:372) ← app/(app)/hr/salary-components.tsx |
| POST /salary-components | 325 | hr.salary-components.create | SalaryComponent (w) | — | hrApi.salaryComponents.create (api.ts:374) ← components/SalaryComponentFormSheet.tsx |
| GET /salary-components/payroll | 433 | hr.salary-components.payroll | — | computeMonthPayroll | hrApi.salaryComponents.payroll (api.ts:379) ← app/(app)/hr/salary-components.tsx |
| PUT /salary-components/:id | 444 | hr.salary-components.edit | SalaryComponent (w) | — | hrApi.salaryComponents.update (api.ts:376) ← components/SalaryComponentFormSheet.tsx |
| DELETE /salary-components/:id | 468 | hr.salary-components.delete | SalaryComponent (w) | — | hrApi.salaryComponents.remove (api.ts:378) ← components/SalaryComponentFormSheet.tsx |
| GET /salary-payments | 483 | hr.salary-payments.view | SalaryPayment | — | hrApi.salaryPayments.list (api.ts:383) ← not called |
| POST /salary-payments | 512 | hr.salary-payments.create | SalaryPayment (w) | computeMonthPayroll | hrApi.salaryPayments.create (api.ts:386) ← components/SalaryPaymentSheet.tsx |
| GET /salary-payments/by-employee | 554 | hr.salary-payments.view | — | computeMonthPayroll | hrApi.salaryPayments.byEmployee (api.ts:391) ← app/(app)/hr/salary-payments.tsx |
| PUT /salary-payments/:id | 567 | hr.salary-payments.edit | SalaryPayment (w) | computeMonthPayroll | hrApi.salaryPayments.update (api.ts:388) ← components/SalaryPaymentSheet.tsx |
| DELETE /salary-payments/:id | 604 | hr.salary-payments.delete | SalaryPayment (w) | — | hrApi.salaryPayments.remove (api.ts:390) ← components/SalaryPaymentSheet.tsx |
| GET /salary-payments/:id | 617 | hr.salary-payments.view | SalaryPayment | — | hrApi.salaryPayments.detail (api.ts:385) ← not called |
| GET /incentives | 635 | hr.incentives.view | SalaryIncentive | — | hrApi.incentives.list (api.ts:395) ← app/(app)/hr/incentives.tsx |
| POST /incentives | 664 | hr.incentives.create | SalaryIncentive (w) | — | not called by the app |
| GET /epf-esic | 691 | hr.epf-esic.view | EpfEsic | — | hrApi.epfEsic.list (api.ts:399) ← app/(app)/hr/epf-esic.tsx |
| POST /epf-esic | 716 | hr.epf-esic.create | EpfEsic (w) | — | not called by the app |
| GET /epf-esic/:id | 747 | hr.epf-esic.view | EpfEsic | — | hrApi.epfEsic.detail (api.ts:401) ← not called |

### estimates — `/api/estimates` — src/routes/estimates.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 71 | estimates.view | Estimate | — | estimatesApi.list (api.ts:323) ← app/(app)/estimates/index.tsx |
| GET /:id | 108 | estimates.view | Estimate | — | estimatesApi.detail (api.ts:325) ← app/(app)/estimates/[id].tsx |
| POST / | 124 | estimates.create | Estimate (w), Order | nextEstimateNo, calcItems, invalidInventoryIdsError, invalidDiscountPercentError, applyDiscount | estimatesApi.create (api.ts:326) ← components/EstimateFormSheet.tsx |
| PUT /:id | 176 | estimates.edit · in handler: estimates.edit | Estimate (w), EstimateItem (w), Order | factsOf, ensure, calcItems, invalidInventoryIdsError, invalidDiscountPercentError, applyDiscount | estimatesApi.update (api.ts:327) ← components/EstimateFormSheet.tsx |
| DELETE /:id | 239 | estimates.delete · in handler: estimates.delete | Estimate (w) | factsOf, ensure | estimatesApi.remove (api.ts:328) ← app/(app)/estimates/[id].tsx |

### gst — `/api/gst` — src/routes/gst.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | gst.view | GstRecord | — | gstApi.list (api.ts:345) ← app/(app)/gst/index.tsx |
| GET /:id | 52 | gst.view | GstRecord | — | gstApi.detail (api.ts:347) ← app/(app)/gst/[id].tsx |
| POST / | 87 | gst.create | GstRecord (w) | splitGst | gstApi.create (api.ts:348) ← components/GstFormSheet.tsx |
| PUT /:id | 133 | gst.edit · in handler: gst.edit | GstRecord (w) | factsOf, ensure, splitGst | gstApi.update (api.ts:349) ← components/GstFormSheet.tsx |
| DELETE /:id | 183 | gst.delete · in handler: gst.delete | GstRecord (w) | factsOf, ensure | gstApi.remove (api.ts:350) ← app/(app)/gst/[id].tsx |

### stock — `/api/stock` — src/routes/stock.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 52 | stock.view (read also by inventory.view, purchases.view) | Stock | — | stockApi.list (api.ts:334) ← app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |
| POST / | 99 | stock.create or purchases.stock-entries | Stock (w) | mayWrite, currentStockForItem | stockApi.create (api.ts:336) ← components/StockEntryFormSheet.tsx, components/StockMovementSheet.tsx |
| PUT /:id | 153 | stock.edit or purchases.stock-entries | Stock (w) | mayWrite, currentStockForItem | stockApi.update (api.ts:337) ← components/StockEntryFormSheet.tsx |
| DELETE /:id | 209 | stock.delete or purchases.stock-entries | Stock (w) | mayWrite, currentStockForItem | stockApi.remove (api.ts:339) ← app/(app)/inventory/[id].tsx, app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |

### vehicles — `/api/vehicles` — src/routes/vehicles.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | vehicles.view | Vehicle | — | vehiclesApi.list (api.ts:408) ← app/(app)/vehicles/index.tsx |
| GET /:id | 40 | vehicles.view | Vehicle | — | vehiclesApi.detail (api.ts:410) ← app/(app)/vehicles/[id].tsx |

### maintenance — `/api/maintenance` — src/routes/maintenance.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | maintenance.view | MaintenancePeriod | — | maintenanceApi.list (api.ts:440) ← app/(app)/maintenance/index.tsx |
| GET /fd-alerts | 35 | maintenance.view | FdAlert | — | maintenanceApi.fdAlerts (api.ts:442) ← not called |

### media — `/api/media` — src/routes/media.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| POST /upload | 101 | requireEntityPermission (media.ts:91) | — | keyToUrl, getModel, getFk, serializeMedia, getEntityFolderName, compressImage | direct /api/media/upload ← hooks/useMediaUpload.ts |
| DELETE /:entity/:id | 162 | requireEntityPermission (media.ts:91) | — | deleteFromMinio, getModel | direct /api/media/:/: ← components/MediaSection.tsx |
| GET /presign/:entity/:id | 183 | requireEntityPermission (media.ts:91) | — | getPresignedUrl, getModel | direct /api/media/presign/inventory/: ← app/(app)/inventory/index.tsx, direct /api/media/presign/:/: ← components/MediaSection.tsx |
| PUT /inventory/:mediaId/primary | 203 | inventory.files.upload | InventoryMedia (w) | — | direct /api/media/inventory/:/primary ← components/MediaSection.tsx |

### calendar — `/api/calendar` — src/routes/calendar.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 26 | calendar or calendar-write or calendar-manage | CalendarEvent, Order | — | calendarApi.list (api.ts:433) ← not called |
| POST / | 66 | calendar-write or calendar-manage | CalendarEvent (w) | — | calendarApi.create (api.ts:434) ← components/DashboardCalendar.tsx |
| PUT /:id | 91 | calendar-write or calendar-manage | CalendarEvent (w) | canManageAny | calendarApi.update (api.ts:435) ← components/DashboardCalendar.tsx |
| DELETE /:id | 120 | calendar-write or calendar-manage | CalendarEvent (w) | canManageAny | calendarApi.remove (api.ts:436) ← components/DashboardCalendar.tsx |

### ledger — `/api/ledger` — src/routes/ledger.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /receivables | 56 | ledger.view | Customer | todayKey, loadLedgerData | ledgerApi.receivables (api.ts:115) ← app/(app)/finance.tsx, app/(app)/ledger/index.tsx |
| GET /customers/:id | 101 | ledger.view | Customer, PaymentReminder | loadLedgerData, buildStatement, buildPosition, validDate, parseId, reminderView | ledgerApi.customer (api.ts:117) ← app/(app)/customers/[id].tsx, app/(app)/ledger/[id].tsx |
| PUT /customers/:id/opening-balance | 141 | ledger.opening-balance | Customer (w) | validDate, parseId | ledgerApi.setOpeningBalance (api.ts:119) ← components/LedgerEntrySheet.tsx |
| GET /customers/:id/due-orders | 172 | ledger.view | — | loadDueOrders, parseId | ledgerApi.dueOrders (api.ts:121) ← components/ReceiptFormSheet.tsx |
| POST /customers/:id/receipts | 192 | ledger.receipts.add · in handler: ledger.receipts.add | CustomerReceipt (w), OrderPayment (w), Customer, raw SQL | recalcOrderPaid, loadDueOrders, ensure, validDate, parseAmount, parseId, nextReceiptNo | ledgerApi.createReceipt (api.ts:123) ← components/ReceiptFormSheet.tsx |
| DELETE /receipts/:id | 296 | ledger.receipts.delete · in handler: ledger.receipts.delete | CustomerReceipt (w), OrderPayment (w) | recalcOrderPaid, factsOf, ensure, parseId | ledgerApi.deleteReceipt (api.ts:125) ← app/(app)/ledger/[id].tsx |
| POST /customers/:id/entries | 334 | ledger.entries.add · in handler: ledger.entries.add | CustomerLedgerEntry (w) | ensure, parseId, readEntry | ledgerApi.createEntry (api.ts:126) ← components/LedgerEntrySheet.tsx |
| PUT /entries/:id | 351 | ledger.entries.edit · in handler: ledger.entries.edit | CustomerLedgerEntry (w) | factsOf, ensure, parseId, readEntry | ledgerApi.updateEntry (api.ts:127) ← components/LedgerEntrySheet.tsx |
| PUT /customers/:id/reminder | 389 | ledger.reminders | PaymentReminder (w), Customer | normalizeIndianMobile, parseId, reminderView | ledgerApi.updateReminder (api.ts:129) ← app/(app)/ledger/[id].tsx |
| POST /customers/:id/send-reminder | 420 | ledger.whatsapp | — | sendError, sendPaymentReminder, parseId | ledgerApi.sendReminder (api.ts:132) ← app/(app)/ledger/[id].tsx |
| POST /customers/:id/send-statement | 432 | ledger.whatsapp | — | sendError, sendAccountStatement, validDate, parseId | ledgerApi.sendStatement (api.ts:134) ← app/(app)/ledger/[id].tsx |
| POST /receipts/:id/send-whatsapp | 448 | ledger.whatsapp | — | sendError, sendPaymentReceivedForReceipt, parseId | ledgerApi.sendReceiptWhatsapp (api.ts:136) ← app/(app)/ledger/[id].tsx |
| POST /payments/:id/send-whatsapp | 460 | ledger.whatsapp | — | sendError, sendPaymentReceivedForPayment, parseId | ledgerApi.sendPaymentWhatsapp (api.ts:138) ← app/(app)/ledger/[id].tsx |
| DELETE /entries/:id | 471 | ledger.entries.delete · in handler: ledger.entries.delete | CustomerLedgerEntry (w) | factsOf, ensure, parseId | ledgerApi.deleteEntry (api.ts:128) ← components/LedgerEntrySheet.tsx |

## 3. Screens (Expo Router, `app/`)

| Route | File | API functions | Components | Feature guard |
|---|---|---|---|---|
| / (layout) | app/_layout.tsx | — | — | — |
| / (layout) | app/(app)/_layout.tsx | — | WebTopNav | — |
| /admin (layout) | app/(app)/admin/_layout.tsx | — | — | — |
| /admin/access | app/(app)/admin/access.tsx | adminApi.check, adminApi.features, adminApi.users.access, adminApi.users.list | SearchPickerModal | — |
| /admin/audit | app/(app)/admin/audit.tsx | adminApi.audit, adminApi.features, adminApi.users.list | SearchPickerModal | — |
| /admin/groups | app/(app)/admin/groups.tsx | adminApi.groups.list, adminApi.groups.remove | GroupFormSheet | — |
| /admin | app/(app)/admin/index.tsx | adminApi.groups.list, adminApi.roles.list, adminApi.users.list | — | — |
| /admin/roles | app/(app)/admin/roles.tsx | adminApi.exportAll, adminApi.importAll, adminApi.roles.copy, adminApi.roles.list, adminApi.roles.remove | RoleFormSheet | — |
| /admin/users | app/(app)/admin/users.tsx | adminApi.users.list, adminApi.users.remove | UserFormSheet | — |
| /customers (layout) | app/(app)/customers/_layout.tsx | — | HubBackButton | 'customers' |
| /customers/[id] | app/(app)/customers/[id].tsx | customersApi.deactivate, customersApi.detail, customersApi.update, ledgerApi.customer | CustomerFormSheet | — |
| /customers | app/(app)/customers/index.tsx | customersApi.list | Breadcrumbs, CustomerFormSheet | — |
| /employees (layout) | app/(app)/employees/_layout.tsx | — | HubBackButton | 'employees' |
| /employees/[id] | app/(app)/employees/[id].tsx | employeesApi.deactivate, employeesApi.detail, employeesApi.permanentDelete, employeesApi.reactivate | EmployeeFormSheet | — |
| /employees | app/(app)/employees/index.tsx | employeesApi.list | Breadcrumbs, EmployeeFormSheet | — |
| /estimates (layout) | app/(app)/estimates/_layout.tsx | — | HubBackButton | 'estimates' |
| /estimates/[id] | app/(app)/estimates/[id].tsx | estimatesApi.detail, estimatesApi.remove | EstimateFormSheet | — |
| /estimates | app/(app)/estimates/index.tsx | estimatesApi.list | Breadcrumbs, CustomerFilterBanner, EstimateFormSheet | — |
| /finance | app/(app)/finance.tsx | dashboardApi.getSummary, ledgerApi.receivables | WebHubPage | — |
| /gst (layout) | app/(app)/gst/_layout.tsx | — | HubBackButton | 'gst' |
| /gst/[id] | app/(app)/gst/[id].tsx | gstApi.detail, gstApi.remove | GstFormSheet | — |
| /gst | app/(app)/gst/index.tsx | gstApi.list | Breadcrumbs, CustomerFilterBanner, GstFormSheet | — |
| /hr (layout) | app/(app)/hr/_layout.tsx | — | — | 'hr' |
| /hr/attendance | app/(app)/hr/attendance.tsx | hrApi.attendance.bulkMark, hrApi.attendance.day, hrApi.attendance.list, hrApi.attendance.monthSummary | AttendanceEditSheet | 'hr.attendance' |
| /hr/employee-attendance | app/(app)/hr/employee-attendance.tsx | hrApi.attendance.list, hrApi.attendance.yearSummary | AttendanceEditSheet | 'hr.attendance' |
| /hr/epf-esic | app/(app)/hr/epf-esic.tsx | hrApi.epfEsic.list | — | 'hr.epf-esic' |
| /hr/incentives | app/(app)/hr/incentives.tsx | hrApi.incentives.list | — | 'hr.incentives' |
| /hr | app/(app)/hr/index.tsx | dashboardApi.getSummary | Breadcrumbs | — |
| /hr/salary-components | app/(app)/hr/salary-components.tsx | hrApi.salaryComponents.list, hrApi.salaryComponents.payroll | MonthYearPickerModal, SalaryComponentFormSheet, SalaryPaymentSheet | 'hr.salary-components' |
| /hr/salary-payments | app/(app)/hr/salary-payments.tsx | hrApi.salaryPayments.byEmployee | MonthYearPickerModal, SalaryPaymentSheet | 'hr.salary-payments' |
| / | app/(app)/index.tsx | dashboardApi.getSummary | DashboardCalendar, RevenueChart | — |
| /inventory (layout) | app/(app)/inventory/_layout.tsx | — | HubBackButton | 'inventory', 'stock' |
| /inventory/[id] | app/(app)/inventory/[id].tsx | inventoryApi.deactivate, inventoryApi.detail, inventoryApi.permanentDelete, inventoryApi.update, stockApi.remove | InventoryFormSheet, MediaSection, StockMovementSheet | — |
| /inventory | app/(app)/inventory/index.tsx | inventoryApi.list, direct /api/media/presign/inventory/: | InventoryFormSheet | — |
| /inventory/stock | app/(app)/inventory/stock.tsx | stockApi.list, stockApi.remove | Breadcrumbs, StockEntryFormSheet | — |
| /invoices (layout) | app/(app)/invoices/_layout.tsx | — | HubBackButton | 'invoices' |
| /invoices/[id] | app/(app)/invoices/[id].tsx | invoicesApi.detail, invoicesApi.remove, invoicesApi.sendWhatsapp | InvoiceFormSheet, MediaSection | — |
| /invoices | app/(app)/invoices/index.tsx | invoicesApi.list | Breadcrumbs, CustomerFilterBanner, InvoiceFormSheet | — |
| /ledger (layout) | app/(app)/ledger/_layout.tsx | — | HubBackButton | 'ledger' |
| /ledger/[id] | app/(app)/ledger/[id].tsx | ledgerApi.customer, ledgerApi.deleteReceipt, ledgerApi.sendPaymentWhatsapp, ledgerApi.sendReceiptWhatsapp, ledgerApi.sendReminder, ledgerApi.sendStatement, ledgerApi.updateReminder | DatePickerModal, LedgerEntrySheet, ReceiptFormSheet | — |
| /ledger | app/(app)/ledger/index.tsx | ledgerApi.receivables | Breadcrumbs | — |
| /maintenance (layout) | app/(app)/maintenance/_layout.tsx | — | HubBackButton | 'maintenance' |
| /maintenance | app/(app)/maintenance/index.tsx | maintenanceApi.list | Breadcrumbs | — |
| /orders (layout) | app/(app)/orders/_layout.tsx | — | HubBackButton | 'orders' |
| /orders/[id] | app/(app)/orders/[id].tsx | ordersApi.detail, ordersApi.remove, ordersApi.sendPaymentWhatsapp, ordersApi.sendWhatsapp | InvoiceFormSheet, MediaSection, OrderFormSheet, PaymentFormSheet | — |
| /orders | app/(app)/orders/index.tsx | ordersApi.list | Breadcrumbs, CustomerFilterBanner, OrderFormSheet | — |
| /people | app/(app)/people.tsx | dashboardApi.getSummary | WebHubPage | — |
| /projects (layout) | app/(app)/projects/_layout.tsx | — | HubBackButton | 'projects' |
| /projects/[id] | app/(app)/projects/[id].tsx | projectsApi.detail, projectsApi.remove | ProjectFormSheet | — |
| /projects | app/(app)/projects/index.tsx | projectsApi.list | Breadcrumbs, ProjectFormSheet | — |
| /purchases (layout) | app/(app)/purchases/_layout.tsx | — | HubBackButton | 'purchases' |
| /purchases/[id] | app/(app)/purchases/[id].tsx | purchasesApi.detail, purchasesApi.remove, stockApi.list, stockApi.remove | PurchaseFormSheet, StockEntryFormSheet | — |
| /purchases | app/(app)/purchases/index.tsx | purchasesApi.list | Breadcrumbs, PurchaseFormSheet | — |
| /tenders (layout) | app/(app)/tenders/_layout.tsx | — | HubBackButton | 'tenders' |
| /tenders/[id] | app/(app)/tenders/[id].tsx | tendersApi.detail, tendersApi.remove | MediaSection, TenderFormSheet | — |
| /tenders | app/(app)/tenders/index.tsx | tendersApi.list | Breadcrumbs, TenderFormSheet | — |
| /vehicles (layout) | app/(app)/vehicles/_layout.tsx | — | HubBackButton | 'vehicles' |
| /vehicles/[id] | app/(app)/vehicles/[id].tsx | vehiclesApi.detail | — | — |
| /vehicles | app/(app)/vehicles/index.tsx | vehiclesApi.list | Breadcrumbs | — |
| /vendors (layout) | app/(app)/vendors/_layout.tsx | — | HubBackButton | 'vendors' |
| /vendors/[id] | app/(app)/vendors/[id].tsx | vendorsApi.delete, vendorsApi.detail, vendorsApi.update | VendorFormSheet | — |
| /vendors | app/(app)/vendors/index.tsx | vendorsApi.list | Breadcrumbs, VendorFormSheet | — |
| /work | app/(app)/work.tsx | dashboardApi.getSummary | WebHubPage | — |
| / (layout) | app/(auth)/_layout.tsx | — | — | — |
| /login | app/(auth)/login.tsx | — | — | — |
| / | app/index.tsx | — | — | — |

## 4. Components and other frontend files

| File | API functions | Used by |
|---|---|---|
| components/AttendanceEditSheet.tsx | hrApi.attendance.remove, hrApi.attendance.update | app/(app)/hr/attendance.tsx, app/(app)/hr/employee-attendance.tsx |
| components/Breadcrumbs.tsx | — | app/(app)/customers/index.tsx, app/(app)/employees/index.tsx, app/(app)/estimates/index.tsx, app/(app)/gst/index.tsx, app/(app)/hr/index.tsx, app/(app)/inventory/stock.tsx, app/(app)/invoices/index.tsx, app/(app)/ledger/index.tsx, app/(app)/maintenance/index.tsx, app/(app)/orders/index.tsx, app/(app)/projects/index.tsx, app/(app)/purchases/index.tsx, app/(app)/tenders/index.tsx, app/(app)/vehicles/index.tsx, app/(app)/vendors/index.tsx |
| components/CameraUploadSheet.tsx | — | not imported |
| components/CustomerFilterBanner.tsx | — | app/(app)/estimates/index.tsx, app/(app)/gst/index.tsx, app/(app)/invoices/index.tsx, app/(app)/orders/index.tsx |
| components/CustomerFormSheet.tsx | customersApi.create, customersApi.update | app/(app)/customers/[id].tsx, app/(app)/customers/index.tsx |
| components/dashboard/ModuleCard.tsx | — | not imported |
| components/DashboardCalendar.tsx | calendarApi.create, calendarApi.remove, calendarApi.update | app/(app)/index.tsx |
| components/DatePickerModal.tsx | — | app/(app)/ledger/[id].tsx |
| components/EmployeeFormSheet.tsx | employeesApi.create, employeesApi.update | app/(app)/employees/[id].tsx, app/(app)/employees/index.tsx |
| components/EstimateFormSheet.tsx | customersApi.list, estimatesApi.create, estimatesApi.update, inventoryApi.list, ordersApi.detail, ordersApi.list, projectsApi.list | app/(app)/estimates/[id].tsx, app/(app)/estimates/index.tsx |
| components/GroupFormSheet.tsx | adminApi.groups.create, adminApi.groups.setMembers, adminApi.groups.setRoles, adminApi.groups.update, adminApi.roles.list, adminApi.users.list | app/(app)/admin/groups.tsx |
| components/GstFormSheet.tsx | customersApi.list, gstApi.create, gstApi.update, vendorsApi.list | app/(app)/gst/[id].tsx, app/(app)/gst/index.tsx |
| components/HubBackButton.tsx | — | app/(app)/customers/_layout.tsx, app/(app)/employees/_layout.tsx, app/(app)/estimates/_layout.tsx, app/(app)/gst/_layout.tsx, app/(app)/inventory/_layout.tsx, app/(app)/invoices/_layout.tsx, app/(app)/ledger/_layout.tsx, app/(app)/maintenance/_layout.tsx, app/(app)/orders/_layout.tsx, app/(app)/projects/_layout.tsx, app/(app)/purchases/_layout.tsx, app/(app)/tenders/_layout.tsx, app/(app)/vehicles/_layout.tsx, app/(app)/vendors/_layout.tsx |
| components/InventoryFormSheet.tsx | inventoryApi.categories, inventoryApi.create, inventoryApi.update | app/(app)/inventory/[id].tsx, app/(app)/inventory/index.tsx |
| components/InvoiceFormSheet.tsx | customersApi.list, inventoryApi.list, invoicesApi.create, invoicesApi.update, ordersApi.detail, ordersApi.list, projectsApi.list, vendorsApi.list | app/(app)/invoices/[id].tsx, app/(app)/invoices/index.tsx, app/(app)/orders/[id].tsx |
| components/LedgerEntrySheet.tsx | ledgerApi.createEntry, ledgerApi.deleteEntry, ledgerApi.setOpeningBalance, ledgerApi.updateEntry | app/(app)/ledger/[id].tsx |
| components/LedgerSheetFrame.tsx | — | not imported |
| components/MediaSection.tsx | direct /api/media/:/:, direct /api/media/inventory/:/primary, direct /api/media/presign/:/: | app/(app)/inventory/[id].tsx, app/(app)/invoices/[id].tsx, app/(app)/orders/[id].tsx, app/(app)/tenders/[id].tsx |
| components/MonthYearPickerModal.tsx | — | app/(app)/hr/salary-components.tsx, app/(app)/hr/salary-payments.tsx |
| components/OrderFormSheet.tsx | customersApi.list, inventoryApi.list, ordersApi.create, ordersApi.update, projectsApi.list, vendorsApi.list | app/(app)/orders/[id].tsx, app/(app)/orders/index.tsx |
| components/PaymentFormSheet.tsx | ordersApi.addPayment, ordersApi.removePayment, ordersApi.updatePayment | app/(app)/orders/[id].tsx |
| components/ProjectFormSheet.tsx | projectsApi.create, projectsApi.update, tendersApi.list | app/(app)/projects/[id].tsx, app/(app)/projects/index.tsx |
| components/PurchaseFormSheet.tsx | inventoryApi.list, purchasesApi.create, purchasesApi.update, vendorsApi.detail, vendorsApi.list | app/(app)/purchases/[id].tsx, app/(app)/purchases/index.tsx |
| components/ReceiptFormSheet.tsx | ledgerApi.createReceipt, ledgerApi.dueOrders | app/(app)/ledger/[id].tsx |
| components/RevenueChart.tsx | — | app/(app)/index.tsx |
| components/RoleFormSheet.tsx | adminApi.features, adminApi.roles.create, adminApi.roles.setPermissions, adminApi.roles.update | app/(app)/admin/roles.tsx |
| components/SalaryComponentFormSheet.tsx | employeesApi.list, hrApi.salaryComponents.create, hrApi.salaryComponents.remove, hrApi.salaryComponents.update | app/(app)/hr/salary-components.tsx |
| components/SalaryPaymentSheet.tsx | hrApi.salaryPayments.create, hrApi.salaryPayments.remove, hrApi.salaryPayments.update | app/(app)/hr/salary-components.tsx, app/(app)/hr/salary-payments.tsx |
| components/SearchPickerModal.tsx | — | app/(app)/admin/access.tsx, app/(app)/admin/audit.tsx |
| components/StockEntryFormSheet.tsx | inventoryApi.detail, inventoryApi.list, stockApi.create, stockApi.update | app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |
| components/StockMovementSheet.tsx | stockApi.create | app/(app)/inventory/[id].tsx |
| components/TenderFormSheet.tsx | tendersApi.create, tendersApi.update | app/(app)/tenders/[id].tsx, app/(app)/tenders/index.tsx |
| components/UserFormSheet.tsx | adminApi.groups.list, adminApi.roles.list, adminApi.users.create, adminApi.users.setGroups, adminApi.users.setRoles, adminApi.users.update | app/(app)/admin/users.tsx |
| components/VendorFormSheet.tsx | vendorsApi.create, vendorsApi.update | app/(app)/vendors/[id].tsx, app/(app)/vendors/index.tsx |
| components/WebHubPage.tsx | — | app/(app)/finance.tsx, app/(app)/people.tsx, app/(app)/work.tsx |
| components/WebTopNav.tsx | — | app/(app)/_layout.tsx |
| hooks/useMediaUpload.ts | direct /api/media/upload | — |
| store/auth.ts | authApi.login, authApi.logout, authApi.me | — |

## 5. Data models (`prisma/schema.prisma`)

| Model | Table | Line | Unique | Links to | Written by | Read by |
|---|---|---|---|---|---|---|
| User | users | 16 | username | CalendarEvent[], SalaryIncentive[], SalaryPayment[], UserGroup[], UserRole[] | routes/admin.ts, routes/auth.ts | middleware/permissions.ts, routes/dashboard.ts |
| Group | groups | 47 | name | GroupPermission[], GroupRole[], UserGroup[] | routes/admin.ts | — |
| UserGroup | user_groups | 63 | — | Group, User | routes/admin.ts | routes/auth.ts |
| GroupPermission | group_permissions | 75 | — | Group | — | — |
| Role | roles | 88 | name | GroupRole[], RolePermission[], UserRole[] | routes/admin.ts | — |
| RolePermission | role_permissions | 106 | — | Role | routes/admin.ts | — |
| GroupRole | group_roles | 119 | — | Group, Role | routes/admin.ts | — |
| AuditLog | audit_logs | 135 | — | — | lib/auditLog.ts | routes/admin.ts |
| UserRole | user_roles | 155 | — | Role, User | routes/admin.ts | — |
| Customer | customers | 169 | customerCode | CustomerLedgerEntry[], CustomerReceipt[], Estimate[], GstRecord[], Invoice[], Order[], PaymentReminder, WhatsappMessage[] | lib/whatsappBot.ts, routes/customers.ts, routes/ledger.ts | lib/customerMessages.ts, lib/ledger.ts, routes/dashboard.ts |
| Tender | tenders | 204 | tenderNo | Project[], TenderMedia[] | routes/tenders.ts | routes/dashboard.ts, routes/media.ts, routes/projects.ts |
| Project | projects | 228 | projectNo | EmployeeAttendance[], Estimate[], Invoice[], MaintenancePeriod[], Order[], ProjectPhotograph[], SalaryIncentive[], Tender, VehicleUsage[] | routes/projects.ts | routes/dashboard.ts, routes/tenders.ts |
| Vendor | vendors | 256 | vendorCode | GstRecord[], Invoice[], OrderVendorWork[], Purchase[] | routes/vendors.ts | routes/dashboard.ts, routes/orders.ts |
| Employee | employees | 283 | employeeCode | EmployeeAttendance[], EpfEsic[], SalaryComponent[], SalaryIncentive[], SalaryPayment[] | routes/employees.ts | lib/whatsappBot.ts, routes/dashboard.ts, routes/hr.ts |
| Inventory | inventory | 311 | itemCode | EstimateItem[], InventoryMedia[], InvoiceItem[], OrderItem[], PurchaseItem[], Stock[] | routes/inventory.ts, routes/purchases.ts | lib/whatsappBot.ts, routes/dashboard.ts, routes/estimates.ts, routes/invoices.ts, routes/media.ts |
| Stock | stocks | 337 | — | Inventory | routes/inventory.ts, routes/purchases.ts, routes/stock.ts | routes/dashboard.ts |
| Order | orders | 368 | orderNo | Customer, Estimate[], Invoice[], OrderItem[], OrderMedia[], OrderPayment[], OrderVendorWork[], Project | lib/ledger.ts, routes/orders.ts | lib/customerMessages.ts, lib/whatsappBot.ts, routes/calendar.ts, routes/customers.ts, routes/dashboard.ts, routes/estimates.ts, routes/invoices.ts, routes/media.ts, routes/projects.ts |
| OrderVendorWork | order_vendor_works | 403 | — | Order, Vendor | routes/orders.ts | routes/vendors.ts |
| OrderItem | order_items | 419 | — | Inventory, Order | routes/orders.ts | routes/inventory.ts |
| OrderPayment | order_payments | 436 | — | CustomerReceipt, Order | routes/ledger.ts, routes/orders.ts | lib/customerMessages.ts, lib/ledger.ts, routes/dashboard.ts |
| CustomerReceipt | customer_receipts | 466 | receiptNo | Customer, OrderPayment[] | routes/ledger.ts | lib/customerMessages.ts, lib/ledger.ts, routes/customers.ts |
| CustomerLedgerEntry | customer_ledger_entries | 489 | — | Customer | routes/ledger.ts | lib/ledger.ts, routes/customers.ts |
| Invoice | invoices | 512 | invoiceNo | Customer, InvoiceItem[], InvoiceMedia[], Order, Project, Vendor | routes/invoices.ts, routes/orders.ts | lib/whatsappBot.ts, routes/customers.ts, routes/dashboard.ts, routes/media.ts, routes/projects.ts, routes/vendors.ts |
| InvoiceItem | invoice_items | 553 | — | Inventory, Invoice | routes/invoices.ts | — |
| Purchase | purchases | 571 | purchaseNo | PurchaseItem[], Vendor | routes/purchases.ts | routes/dashboard.ts, routes/stock.ts, routes/vendors.ts |
| PurchaseItem | purchase_items | 597 | — | Inventory, Purchase | routes/purchases.ts | — |
| EmployeeAttendance | employee_attendances | 620 | — | Employee, Project | routes/hr.ts | routes/dashboard.ts |
| SalaryComponent | salary_components | 639 | — | Employee | routes/hr.ts | — |
| SalaryPayment | salary_payments | 657 | — | Employee, User | routes/hr.ts | routes/dashboard.ts, routes/employees.ts |
| SalaryIncentive | salary_incentives | 679 | — | Employee, Project, User | routes/hr.ts | routes/dashboard.ts, routes/employees.ts |
| EpfEsic | epf_esic | 700 | — | Employee | routes/hr.ts | routes/employees.ts |
| Estimate | estimates | 727 | estimateNo | Customer, EstimateItem[], Order, Project | routes/estimates.ts | routes/customers.ts, routes/dashboard.ts, routes/projects.ts |
| EstimateItem | estimate_items | 757 | — | Estimate, Inventory | routes/estimates.ts | — |
| GstRecord | gst_records | 774 | — | Customer, Vendor | routes/gst.ts, routes/orders.ts | routes/dashboard.ts |
| TenderMedia | tender_media | 806 | — | Tender | — | routes/tenders.ts |
| InvoiceMedia | invoice_media | 820 | — | Invoice | — | routes/invoices.ts |
| InventoryMedia | inventory_media | 834 | — | Inventory | routes/media.ts | routes/inventory.ts |
| OrderMedia | order_media | 849 | — | Order | routes/orders.ts | — |
| MaintenancePeriod | maintenance_periods | 865 | — | FdAlert[], Project | — | routes/dashboard.ts, routes/maintenance.ts |
| FdAlert | fd_alerts | 880 | — | MaintenancePeriod | — | routes/maintenance.ts |
| ProjectPhotograph | project_photographs | 897 | — | Project | — | — |
| Vehicle | vehicles | 914 | vehicleNo | VehicleUsage[] | — | routes/dashboard.ts, routes/vehicles.ts |
| VehicleUsage | vehicle_usages | 937 | — | Project, Vehicle | — | — |
| CalendarEvent | calendar_events | 963 | — | User | routes/calendar.ts | — |
| WhatsappMessage | whatsapp_messages | 985 | waMessageId | Customer | lib/whatsappBot.ts, lib/whatsappLog.ts | — |
| PaymentReminder | payment_reminders | 1009 | customerId | Customer | lib/customerMessages.ts, lib/paymentReminders.ts, routes/ledger.ts | — |

## 6. Backend helpers

Exported from `src/lib`, `src/utils`, `src/middleware`, plus functions local to a route file.

| Function | File:line | Tables | Calls | Called from |
|---|---|---|---|---|
| summaryOf | src/lib/auditLog.ts:20 | — | — | lib/auditLog.ts |
| entityIdOf | src/lib/auditLog.ts:34 | — | — | lib/auditLog.ts |
| actionOf | src/lib/auditLog.ts:45 | — | — | lib/auditLog.ts |
| auditTrail | src/lib/auditLog.ts:53 | AuditLog (w) | summaryOf, entityIdOf, actionOf | not called |
| startAuditCleanup | src/lib/auditLog.ts:79 | — | — | not called |
| sendError | src/lib/customerMessages.ts:28 | — | — | routes/ledger.ts, routes/orders.ts |
| amountText | src/lib/customerMessages.ts:37 | — | — | lib/customerMessages.ts |
| rs | src/lib/customerMessages.ts:40 | — | amountText | lib/customerMessages.ts, lib/whatsappBot.ts |
| day | src/lib/customerMessages.ts:44 | — | — | lib/customerMessages.ts, lib/whatsappBot.ts, middleware/permissions.ts |
| balanceText | src/lib/customerMessages.ts:50 | — | rs | lib/customerMessages.ts, lib/whatsappBot.ts |
| currentFy | src/lib/customerMessages.ts:54 | — | todayKey | lib/whatsappBot.ts |
| variable | src/lib/customerMessages.ts:63 | — | — | not called |
| modeText | src/lib/customerMessages.ts:67 | — | — | lib/customerMessages.ts |
| send | src/lib/customerMessages.ts:79 | — | recipientRefusal, whatsappConfigError, normalizeIndianMobile, uploadMedia, sendTemplate, logWhatsapp | lib/customerMessages.ts |
| ledgerOf | src/lib/customerMessages.ts:124 | — | loadLedgerData | lib/customerMessages.ts |
| sendOrderConfirmation | src/lib/customerMessages.ts:129 | Order | amountText, day, send, dayKey | routes/orders.ts |
| sendPaymentReceived | src/lib/customerMessages.ts:148 | — | amountText, day, balanceText, modeText, send, ledgerOf, dayKey, buildPosition | lib/customerMessages.ts |
| sendPaymentReceivedForPayment | src/lib/customerMessages.ts:158 | OrderPayment | amountText, sendPaymentReceived | routes/ledger.ts, routes/orders.ts |
| sendPaymentReceivedForReceipt | src/lib/customerMessages.ts:176 | CustomerReceipt | sendPaymentReceived | routes/ledger.ts |
| sendPaymentReminder | src/lib/customerMessages.ts:189 | PaymentReminder (w), Customer | amountText, rs, day, balanceText, send, ledgerOf, buildStatement, buildPosition, renderStatementPdf | lib/paymentReminders.ts, routes/ledger.ts |
| periodText | src/lib/customerMessages.ts:216 | — | day, todayKey | lib/customerMessages.ts |
| sendAccountStatement | src/lib/customerMessages.ts:224 | Customer | balanceText, send, ledgerOf, periodText, buildStatement, buildPosition, renderStatementPdf | routes/ledger.ts |
| dayKey | src/lib/ledger.ts:33 | — | — | lib/customerMessages.ts, lib/ledger.ts, lib/paymentReminders.ts |
| todayKey | src/lib/ledger.ts:36 | — | dayKey | lib/customerMessages.ts, lib/ledger.ts, routes/ledger.ts, utils/statementPdf.ts |
| emptyData | src/lib/ledger.ts:62 | — | — | lib/ledger.ts |
| loadLedgerData | src/lib/ledger.ts:68 | Customer, CustomerLedgerEntry, CustomerReceipt, Order, OrderPayment | dayKey, emptyData | lib/customerMessages.ts, lib/whatsappBot.ts, routes/ledger.ts |
| modeText | src/lib/ledger.ts:156 | — | — | lib/ledger.ts |
| fmtRupees | src/lib/ledger.ts:161 | — | — | lib/ledger.ts |
| buildRawLines | src/lib/ledger.ts:167 | — | modeText, fmtRupees | lib/ledger.ts |
| buildStatement | src/lib/ledger.ts:256 | — | buildRawLines | lib/customerMessages.ts, lib/whatsappBot.ts, routes/ledger.ts |
| buildPosition | src/lib/ledger.ts:300 | — | todayKey | lib/customerMessages.ts, lib/whatsappBot.ts, routes/ledger.ts |
| recalcOrderPaid | src/lib/ledger.ts:376 | Order (w), OrderPayment | — | routes/ledger.ts, routes/orders.ts |
| loadDueOrders | src/lib/ledger.ts:388 | Order, OrderPayment | dayKey | routes/ledger.ts |
| fileUrlToKey | src/lib/minio.ts:20 | — | — | lib/minio.ts |
| keyToUrl | src/lib/minio.ts:27 | — | — | routes/media.ts |
| deleteFromMinio | src/lib/minio.ts:35 | — | fileUrlToKey | routes/invoices.ts, routes/media.ts, routes/orders.ts, routes/tenders.ts |
| getPresignedUrl | src/lib/minio.ts:40 | — | fileUrlToKey | routes/media.ts |
| remindersEnabled | src/lib/paymentReminders.ts:32 | — | — | not called |
| nextReminderDay | src/lib/paymentReminders.ts:40 | — | dayKey | lib/paymentReminders.ts, routes/ledger.ts |
| runReminderPass | src/lib/paymentReminders.ts:50 | PaymentReminder (w) | sendPaymentReminder, dayKey, nextReminderDay | lib/paymentReminders.ts |
| startPaymentReminders | src/lib/paymentReminders.ts:88 | — | runReminderPass | not called |
| buildUrl | src/lib/prisma.ts:19 | — | — | not called |
| parseRecipientList | src/lib/whatsapp.ts:52 | — | normalizeIndianMobile | not called |
| recipientRefusal | src/lib/whatsapp.ts:58 | — | — | lib/customerMessages.ts, lib/whatsapp.ts, lib/whatsappBot.ts, routes/invoices.ts |
| whatsappConfigError | src/lib/whatsapp.ts:68 | — | — | lib/customerMessages.ts, lib/whatsapp.ts, routes/invoices.ts |
| requireConfig | src/lib/whatsapp.ts:75 | — | whatsappConfigError | lib/whatsapp.ts |
| normalizeIndianMobile | src/lib/whatsapp.ts:107 | — | — | lib/customerMessages.ts, lib/whatsapp.ts, lib/whatsappBot.ts, routes/invoices.ts, routes/ledger.ts |
| metaFetch | src/lib/whatsapp.ts:114 | — | requireConfig | lib/whatsapp.ts |
| uploadMedia | src/lib/whatsapp.ts:135 | — | metaFetch | lib/customerMessages.ts, lib/whatsappBot.ts, routes/invoices.ts |
| sendMessage | src/lib/whatsapp.ts:144 | — | metaFetch | lib/whatsapp.ts |
| sendTemplate | src/lib/whatsapp.ts:158 | — | recipientRefusal, sendMessage | lib/customerMessages.ts, routes/invoices.ts |
| sendText | src/lib/whatsapp.ts:184 | — | sendMessage | lib/whatsappBot.ts |
| sendButtons | src/lib/whatsapp.ts:189 | — | sendMessage | not called |
| sendList | src/lib/whatsapp.ts:202 | — | sendMessage | lib/whatsappBot.ts |
| sendDocument | src/lib/whatsapp.ts:228 | — | sendMessage | lib/whatsappBot.ts |
| verifyWebhookSignature | src/lib/whatsapp.ts:234 | — | — | routes/whatsappWebhook.ts |
| enqueueWebhook | src/lib/whatsappBot.ts:66 | — | processWebhook | routes/whatsappWebhook.ts |
| processWebhook | src/lib/whatsappBot.ts:72 | — | applyStatus, handleMessage | lib/whatsappBot.ts |
| applyStatus | src/lib/whatsappBot.ts:91 | WhatsappMessage (w) | — | lib/whatsappBot.ts |
| findCustomersByPhone | src/lib/whatsappBot.ts:110 | Customer | normalizeIndianMobile | lib/whatsappBot.ts |
| findStaffByPhone | src/lib/whatsappBot.ts:129 | Employee | normalizeIndianMobile | lib/whatsappBot.ts |
| handleMessage | src/lib/whatsappBot.ts:139 | WhatsappMessage | recipientRefusal, sendText, sendList, findCustomersByPhone, findStaffByPhone, repliedToday, sendStaffMenu, sendMenu, reply, setOptOut, bookingHint, categoryRows, categoryItemsText, pendingSummary, ordersSummary, invoiceRows, sendInvoicePdf, paymentsSummary, sendStatements, logWhatsapp | lib/whatsappBot.ts |
| repliedToday | src/lib/whatsappBot.ts:250 | WhatsappMessage | — | lib/whatsappBot.ts |
| sendStaffMenu | src/lib/whatsappBot.ts:261 | — | sendText, reply | lib/whatsappBot.ts |
| sendMenu | src/lib/whatsappBot.ts:266 | — | sendList, reply | lib/whatsappBot.ts |
| reply | src/lib/whatsappBot.ts:270 | — | logWhatsapp | lib/whatsappBot.ts |
| setOptOut | src/lib/whatsappBot.ts:283 | Customer (w) | normalizeIndianMobile | lib/whatsappBot.ts |
| bookingHint | src/lib/whatsappBot.ts:292 | — | — | lib/whatsappBot.ts |
| categoryRows | src/lib/whatsappBot.ts:299 | Inventory | — | lib/whatsappBot.ts |
| categoryItemsText | src/lib/whatsappBot.ts:318 | Inventory | rs | lib/whatsappBot.ts |
| withActivity | src/lib/whatsappBot.ts:351 | — | — | lib/whatsappBot.ts |
| pendingSummary | src/lib/whatsappBot.ts:361 | — | rs, day, loadLedgerData, buildStatement, buildPosition, withActivity | lib/whatsappBot.ts |
| ordersSummary | src/lib/whatsappBot.ts:381 | Order | rs, day | lib/whatsappBot.ts |
| invoiceRows | src/lib/whatsappBot.ts:406 | Invoice | rs, day | lib/whatsappBot.ts |
| sendInvoicePdf | src/lib/whatsappBot.ts:422 | Invoice | rs, day, uploadMedia, sendDocument, reply, renderInvoicePdf | lib/whatsappBot.ts |
| paymentsSummary | src/lib/whatsappBot.ts:441 | — | rs, day, loadLedgerData, buildStatement, withActivity | lib/whatsappBot.ts |
| sendStatements | src/lib/whatsappBot.ts:461 | — | balanceText, currentFy, loadLedgerData, buildStatement, buildPosition, uploadMedia, sendDocument, reply, withActivity, renderStatementPdf | lib/whatsappBot.ts |
| logWhatsapp | src/lib/whatsappLog.ts:5 | WhatsappMessage (w) | — | lib/customerMessages.ts, lib/whatsappBot.ts, routes/invoices.ts |
| requireAuth | src/middleware/auth.ts:14 | — | — | route middleware |
| requireStaff | src/middleware/auth.ts:40 | — | — | route middleware |
| factsOf | src/middleware/permissions.ts:38 | — | — | routes/estimates.ts, routes/gst.ts, routes/invoices.ts, routes/ledger.ts, routes/orders.ts, routes/purchases.ts, routes/stock.ts |
| invalidateUserAccess | src/middleware/permissions.ts:79 | — | — | routes/admin.ts, routes/auth.ts |
| invalidateAllAccess | src/middleware/permissions.ts:83 | — | — | routes/admin.ts |
| getEffectiveAccess | src/middleware/permissions.ts:92 | User | normalizeConditions | middleware/permissions.ts, routes/admin.ts |
| normalizeConditions | src/middleware/permissions.ts:136 | — | — | middleware/permissions.ts, routes/admin.ts |
| ancestors | src/middleware/permissions.ts:148 | — | — | middleware/permissions.ts |
| covering | src/middleware/permissions.ts:154 | — | ancestors | middleware/permissions.ts |
| featureSatisfied | src/middleware/permissions.ts:159 | — | ancestors | not called |
| failedCondition | src/middleware/permissions.ts:166 | — | day | middleware/permissions.ts |
| decide | src/middleware/permissions.ts:181 | — | covering, failedCondition | middleware/permissions.ts, routes/admin.ts |
| deniedMessage | src/middleware/permissions.ts:204 | — | — | middleware/permissions.ts |
| getPermissionKeys | src/middleware/permissions.ts:215 | — | getEffectiveAccess, decide | routes/auth.ts |
| holds | src/middleware/permissions.ts:223 | — | getEffectiveAccess, decide | routes/calendar.ts, routes/employees.ts, routes/orders.ts, routes/stock.ts |
| can | src/middleware/permissions.ts:232 | — | getEffectiveAccess, decide, deniedMessage | route middleware |
| ensure | src/middleware/permissions.ts:262 | — | getEffectiveAccess, decide, deniedMessage | routes/customers.ts, routes/employees.ts, routes/estimates.ts, routes/gst.ts, routes/inventory.ts, routes/invoices.ts, routes/ledger.ts, routes/orders.ts, routes/purchases.ts, routes/stock.ts |
| requirePermission | src/middleware/permissions.ts:280 | — | — | route middleware |
| requireAnyPermission | src/middleware/permissions.ts:281 | — | — | route middleware |
| requireSuperAdmin | src/middleware/permissions.ts:285 | — | getEffectiveAccess | route middleware |
| serializeUser | src/routes/admin.ts:22 | — | — | routes/admin.ts |
| serializeRole | src/routes/admin.ts:265 | — | — | routes/admin.ts |
| readPermissions | src/routes/admin.ts:280 | — | normalizeConditions | routes/admin.ts |
| serializeGroup | src/routes/admin.ts:436 | — | — | routes/admin.ts |
| canManageAny | src/routes/calendar.ts:15 | — | holds | routes/calendar.ts |
| nextCustomerCode | src/routes/customers.ts:76 | Customer | — | routes/customers.ts |
| withCustomerNames | src/routes/dashboard.ts:147 | Customer | — | routes/dashboard.ts |
| hideSalary | src/routes/employees.ts:16 | — | — | routes/employees.ts |
| nextEstimateNo | src/routes/estimates.ts:15 | Estimate | — | routes/estimates.ts |
| calcItems | src/routes/estimates.ts:35 | — | — | routes/estimates.ts |
| invalidInventoryIdsError | src/routes/estimates.ts:50 | Inventory | — | routes/estimates.ts |
| invalidDiscountPercentError | src/routes/estimates.ts:59 | — | — | routes/estimates.ts |
| applyDiscount | src/routes/estimates.ts:64 | — | — | routes/estimates.ts |
| splitGst | src/routes/gst.ts:80 | — | — | routes/gst.ts |
| computeMonthPayroll | src/routes/hr.ts:354 | Employee, EmployeeAttendance, SalaryComponent, SalaryPayment | — | routes/hr.ts |
| calcStock | src/routes/inventory.ts:12 | — | — | routes/inventory.ts |
| nextInvoiceNo | src/routes/invoices.ts:25 | Invoice | — | routes/invoices.ts |
| calcItems | src/routes/invoices.ts:58 | — | — | routes/invoices.ts |
| invalidDiscountPercentError | src/routes/invoices.ts:76 | — | — | routes/invoices.ts |
| applyDiscount | src/routes/invoices.ts:81 | — | — | routes/invoices.ts |
| invalidInventoryIdsError | src/routes/invoices.ts:91 | Inventory | — | routes/invoices.ts |
| validDate | src/routes/ledger.ts:22 | — | — | routes/ledger.ts |
| parseAmount | src/routes/ledger.ts:27 | — | — | routes/ledger.ts |
| parseId | src/routes/ledger.ts:33 | — | — | routes/ledger.ts |
| nextReceiptNo | src/routes/ledger.ts:40 | CustomerReceipt | — | routes/ledger.ts |
| readEntry | src/routes/ledger.ts:323 | — | validDate, parseAmount | routes/ledger.ts |
| reminderView | src/routes/ledger.ts:371 | — | nextReminderDay | routes/ledger.ts |
| getModel | src/routes/media.ts:30 | — | — | routes/media.ts |
| getFk | src/routes/media.ts:40 | — | — | routes/media.ts |
| serializeMedia | src/routes/media.ts:44 | — | — | routes/media.ts |
| getEntityFolderName | src/routes/media.ts:50 | Inventory, Invoice, Order, Tender | — | routes/media.ts |
| compressImage | src/routes/media.ts:72 | — | — | routes/media.ts |
| requireEntityPermission | src/routes/media.ts:91 | — | — | not called |
| calcItemTotals | src/routes/orders.ts:75 | — | — | routes/orders.ts |
| nextOrderNo | src/routes/orders.ts:110 | Order | — | routes/orders.ts |
| nextInvoiceNoTx | src/routes/orders.ts:121 | Invoice | — | routes/orders.ts |
| calcInvoiceTotals | src/routes/orders.ts:137 | — | — | routes/orders.ts |
| readVendorWorks | src/routes/orders.ts:160 | Vendor | — | routes/orders.ts |
| parseDateField | src/routes/projects.ts:18 | — | — | routes/projects.ts |
| calcTotals | src/routes/purchases.ts:16 | — | — | routes/purchases.ts |
| derivePaymentStatus | src/routes/purchases.ts:25 | — | — | routes/purchases.ts |
| d | src/routes/purchases.ts:31 | — | — | routes/purchases.ts |
| ensureInventoryItem | src/routes/purchases.ts:40 | Inventory (w) | — | routes/purchases.ts |
| applyStockTransition | src/routes/purchases.ts:71 | PurchaseItem (w), Stock (w) | d, ensureInventoryItem | routes/purchases.ts |
| mayWrite | src/routes/stock.ts:18 | Purchase | factsOf, holds, ensure | routes/stock.ts |
| calcStock | src/routes/stock.ts:33 | — | — | routes/stock.ts |
| currentStockForItem | src/routes/stock.ts:42 | Stock | calcStock | routes/stock.ts |
| parseDateField | src/routes/tenders.ts:25 | — | — | routes/tenders.ts |
| validateTenderFields | src/routes/tenders.ts:97 | — | — | routes/tenders.ts |
| verifyDjangoPassword | src/utils/django_password.ts:7 | — | timingSafeEqual | routes/auth.ts |
| hashDjangoPassword | src/utils/django_password.ts:28 | — | — | routes/admin.ts |
| timingSafeEqual | src/utils/django_password.ts:35 | — | — | utils/django_password.ts |
| esc | src/utils/invoicePdf.ts:30 | — | — | utils/invoicePdf.ts, utils/statementPdf.ts |
| num | src/utils/invoicePdf.ts:33 | — | — | utils/invoicePdf.ts |
| fmtDate | src/utils/invoicePdf.ts:38 | — | — | utils/invoicePdf.ts |
| fmtQty | src/utils/invoicePdf.ts:45 | — | num | utils/invoicePdf.ts |
| fmtAmt | src/utils/invoicePdf.ts:49 | — | num | utils/invoicePdf.ts |
| iconChip | src/utils/invoicePdf.ts:58 | — | — | utils/invoicePdf.ts, utils/statementPdf.ts |
| buildInvoiceHtml | src/utils/invoicePdf.ts:84 | — | esc, num, fmtDate, fmtQty, fmtAmt, iconChip | utils/invoicePdf.ts |
| renderHtmlToPdf | src/utils/invoicePdf.ts:255 | — | renderNow | utils/invoicePdf.ts, utils/statementPdf.ts |
| renderNow | src/utils/invoicePdf.ts:261 | — | — | utils/invoicePdf.ts |
| renderInvoicePdf | src/utils/invoicePdf.ts:282 | — | buildInvoiceHtml, renderHtmlToPdf | lib/whatsappBot.ts, routes/invoices.ts |
| isoToDisplay | src/utils/statementPdf.ts:17 | — | — | utils/statementPdf.ts |
| todayIso | src/utils/statementPdf.ts:21 | — | todayKey | utils/statementPdf.ts |
| amt | src/utils/statementPdf.ts:25 | — | — | utils/statementPdf.ts |
| bal | src/utils/statementPdf.ts:28 | — | amt | utils/statementPdf.ts |
| buildStatementHtml | src/utils/statementPdf.ts:33 | — | esc, iconChip, isoToDisplay, todayIso, amt, bal | utils/statementPdf.ts |
| renderStatementPdf | src/utils/statementPdf.ts:175 | — | renderHtmlToPdf, buildStatementHtml | lib/customerMessages.ts, lib/whatsappBot.ts |

## 7. Loose ends

App functions with no matching backend route (a bug, or the parser missed a pattern):

- none

App functions defined in `services/api.ts` but not called by any app file:

- dashboardApi.getRevenue, dashboardApi.getCollectedByCustomer, dashboardApi.getOutstandingByCustomer, hrApi.attendance.detail, hrApi.salaryPayments.list, hrApi.salaryPayments.detail, hrApi.epfEsic.detail, calendarApi.list, maintenanceApi.fdAlerts

Endpoints without a permission check (verify fails on these; open ones are listed in OPEN_ENDPOINTS, scripts/code-map.js):

- none

