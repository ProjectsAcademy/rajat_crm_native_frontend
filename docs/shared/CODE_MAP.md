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
| admin | `/api/admin` | src/routes/admin.ts | super admin | 11 | adminApi | app/(app)/admin/ |
| dashboard | `/api/dashboard` | src/routes/dashboard.ts | auth only, revenue | 4 | dashboardApi | — |
| customers | `/api/customers` | src/routes/customers.ts | customers | 5 | customersApi | app/(app)/customers/ |
| tenders | `/api/tenders` | src/routes/tenders.ts | tenders | 5 | tendersApi | app/(app)/tenders/ |
| projects | `/api/projects` | src/routes/projects.ts | projects | 5 | projectsApi | app/(app)/projects/ |
| vendors | `/api/vendors` | src/routes/vendors.ts | vendors | 5 | vendorsApi | app/(app)/vendors/ |
| employees | `/api/employees` | src/routes/employees.ts | employees | 5 | employeesApi | app/(app)/employees/ |
| inventory | `/api/inventory` | src/routes/inventory.ts | inventory | 7 | inventoryApi | app/(app)/inventory/ |
| orders | `/api/orders` | src/routes/orders.ts | orders | 8 | ordersApi | app/(app)/orders/ |
| invoices | `/api/invoices` | src/routes/invoices.ts | invoices | 6 | invoicesApi | app/(app)/invoices/ |
| purchases | `/api/purchases` | src/routes/purchases.ts | purchases | 5 | purchasesApi | app/(app)/purchases/ |
| hr | `/api/hr` | src/routes/hr.ts | hr.attendance, hr.epf-esic, hr.incentives, hr.salary-components, hr.salary-payments | 25 | hrApi | app/(app)/hr/ |
| estimates | `/api/estimates` | src/routes/estimates.ts | estimates | 5 | estimatesApi | app/(app)/estimates/ |
| gst | `/api/gst` | src/routes/gst.ts | gst | 5 | gstApi | app/(app)/gst/ |
| stock | `/api/stock` | src/routes/stock.ts | stock | 4 | stockApi | — |
| vehicles | `/api/vehicles` | src/routes/vehicles.ts | vehicles | 2 | vehiclesApi | app/(app)/vehicles/ |
| maintenance | `/api/maintenance` | src/routes/maintenance.ts | maintenance | 2 | maintenanceApi | app/(app)/maintenance/ |
| media | `/api/media` | src/routes/media.ts | inventory, requireEntityPermission (media.ts:86) | 4 | — | — |
| calendar | `/api/calendar` | src/routes/calendar.ts | calendar or calendar-write or calendar-manage, calendar-write or calendar-manage | 4 | calendarApi | — |
| ledger | `/api/ledger` | src/routes/ledger.ts | ledger | 9 | ledgerApi | app/(app)/ledger/ |

## 2. API endpoints

### whatsappWebhook — `/api/whatsapp/webhook` — src/routes/whatsappWebhook.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 25 | public | — | — | not called by the app |
| POST / | 36 | public | — | verifyWebhookSignature, enqueueWebhook | not called by the app |

### auth — `/api/auth` — src/routes/auth.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| POST /login | 17 | public | User (w), UserGroup | verifyDjangoPassword, invalidateUserAccess, getPermissionKeys | authApi.login (api.ts:28) ← store/auth.ts |
| GET /me | 92 | auth only (any check is in the handler) | User, UserGroup | getPermissionKeys | authApi.me (api.ts:30) ← store/auth.ts |
| POST /logout | 130 | auth only (any check is in the handler) | — | — | authApi.logout (api.ts:31) ← store/auth.ts |

### admin — `/api/admin` — src/routes/admin.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /features | 24 | super admin | — | — | adminApi.features (api.ts:37) ← components/GroupFormSheet.tsx |
| GET /users | 29 | super admin | User | — | adminApi.users.list (api.ts:39) ← app/(app)/admin/index.tsx, app/(app)/admin/users.tsx |
| POST /users | 40 | super admin | User (w) | hashDjangoPassword, serializeUser | adminApi.users.create (api.ts:40) ← components/UserFormSheet.tsx |
| PUT /users/:id | 82 | super admin | User (w) | hashDjangoPassword, invalidateUserAccess, serializeUser | adminApi.users.update (api.ts:41) ← components/UserFormSheet.tsx |
| PUT /users/:id/groups | 131 | super admin | UserGroup (w), User | invalidateUserAccess, serializeUser | adminApi.users.setGroups (api.ts:43) ← components/UserFormSheet.tsx |
| DELETE /users/:id | 161 | super admin | User (w) | invalidateUserAccess | adminApi.users.remove (api.ts:45) ← app/(app)/admin/users.tsx |
| GET /groups | 205 | super admin | Group | — | adminApi.groups.list (api.ts:48) ← app/(app)/admin/groups.tsx, app/(app)/admin/index.tsx, components/UserFormSheet.tsx |
| POST /groups | 216 | super admin | Group (w) | serializeGroup | adminApi.groups.create (api.ts:49) ← components/GroupFormSheet.tsx |
| PUT /groups/:id | 246 | super admin | Group (w) | invalidateAllAccess, serializeGroup | adminApi.groups.update (api.ts:50) ← components/GroupFormSheet.tsx |
| DELETE /groups/:id | 271 | super admin | Group (w), UserGroup | invalidateAllAccess | adminApi.groups.remove (api.ts:52) ← app/(app)/admin/groups.tsx |
| PUT /groups/:id/permissions | 290 | super admin | GroupPermission (w), Group | invalidateAllAccess, serializeGroup | adminApi.groups.setPermissions (api.ts:54) ← components/GroupFormSheet.tsx |

### dashboard — `/api/dashboard` — src/routes/dashboard.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 11 | auth only (any check is in the handler) | Customer, Employee, EmployeeAttendance, Estimate, GstRecord, Inventory, Invoice, MaintenancePeriod, Order, OrderPayment, Project, Purchase, SalaryIncentive, SalaryPayment, Stock, Tender, User, Vehicle, Vendor | — | dashboardApi.getSummary (api.ts:71) ← app/(app)/finance.tsx, app/(app)/hr/index.tsx, app/(app)/index.tsx, app/(app)/people.tsx, app/(app)/work.tsx |
| GET /revenue | 93 | revenue | Order | — | dashboardApi.getRevenue (api.ts:72) ← components/RevenueChart.tsx |
| GET /collected-by-customer | 174 | revenue | Order | withCustomerNames | dashboardApi.getCollectedByCustomer (api.ts:73) ← not called |
| GET /outstanding-by-customer | 197 | revenue | Order | withCustomerNames | dashboardApi.getOutstandingByCustomer (api.ts:74) ← not called |

### customers — `/api/customers` — src/routes/customers.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | customers | Customer | — | customersApi.list (api.ts:80) ← app/(app)/customers/index.tsx, components/EstimateFormSheet.tsx, components/GstFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx |
| GET /:id | 51 | customers | Customer | — | customersApi.detail (api.ts:82) ← app/(app)/customers/[id].tsx |
| POST / | 87 | customers | Customer (w) | nextCustomerCode | customersApi.create (api.ts:83) ← components/CustomerFormSheet.tsx |
| PUT /:id | 135 | customers | Customer (w) | — | customersApi.update (api.ts:84) ← app/(app)/customers/[id].tsx, components/CustomerFormSheet.tsx |
| DELETE /:id | 165 | customers | Customer (w), CustomerLedgerEntry, CustomerReceipt, Estimate, Invoice, Order | — | customersApi.deactivate (api.ts:86) ← app/(app)/customers/[id].tsx |

### tenders — `/api/tenders` — src/routes/tenders.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 30 | tenders | Tender | — | tendersApi.list (api.ts:125) ← app/(app)/tenders/index.tsx, components/ProjectFormSheet.tsx |
| GET /:id | 69 | tenders | Tender | — | tendersApi.detail (api.ts:127) ← app/(app)/tenders/[id].tsx |
| POST / | 133 | tenders | Tender (w) | parseDateField, validateTenderFields | tendersApi.create (api.ts:128) ← components/TenderFormSheet.tsx |
| PUT /:id | 172 | tenders | Tender (w) | parseDateField, validateTenderFields | tendersApi.update (api.ts:129) ← components/TenderFormSheet.tsx |
| DELETE /:id | 223 | tenders | Tender (w), Project, TenderMedia | deleteFromMinio | tendersApi.remove (api.ts:130) ← app/(app)/tenders/[id].tsx |

### projects — `/api/projects` — src/routes/projects.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 23 | projects | Project | — | projectsApi.list (api.ts:196) ← app/(app)/projects/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx |
| GET /:id | 60 | projects | Project | — | projectsApi.detail (api.ts:198) ← app/(app)/projects/[id].tsx |
| POST / | 81 | projects | Project (w), Tender | parseDateField | projectsApi.create (api.ts:199) ← components/ProjectFormSheet.tsx |
| PUT /:id | 142 | projects | Project (w), Tender | parseDateField | projectsApi.update (api.ts:200) ← components/ProjectFormSheet.tsx |
| DELETE /:id | 216 | projects | Project (w), Estimate, Invoice, Order | — | projectsApi.remove (api.ts:201) ← app/(app)/projects/[id].tsx |

### vendors — `/api/vendors` — src/routes/vendors.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | vendors | Vendor | — | vendorsApi.list (api.ts:151) ← app/(app)/vendors/index.tsx, components/GstFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx, components/PurchaseFormSheet.tsx |
| GET /:id | 48 | vendors | Vendor | — | vendorsApi.detail (api.ts:153) ← app/(app)/vendors/[id].tsx, components/PurchaseFormSheet.tsx |
| POST / | 73 | vendors | Vendor (w) | — | vendorsApi.create (api.ts:154) ← components/VendorFormSheet.tsx |
| PUT /:id | 117 | vendors | Vendor (w) | — | vendorsApi.update (api.ts:155) ← app/(app)/vendors/[id].tsx, components/VendorFormSheet.tsx |
| DELETE /:id | 152 | vendors | Vendor (w), Invoice, OrderVendorWork, Purchase | — | vendorsApi.delete (api.ts:157) ← app/(app)/vendors/[id].tsx |

### employees — `/api/employees` — src/routes/employees.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | employees | Employee | — | employeesApi.list (api.ts:173) ← app/(app)/employees/index.tsx, components/SalaryComponentFormSheet.tsx |
| GET /:id | 48 | employees | Employee | — | employeesApi.detail (api.ts:175) ← app/(app)/employees/[id].tsx |
| POST / | 64 | employees | Employee (w) | — | employeesApi.create (api.ts:176) ← components/EmployeeFormSheet.tsx |
| PUT /:id | 117 | employees | Employee (w) | — | employeesApi.update (api.ts:177) ← components/EmployeeFormSheet.tsx, employeesApi.deactivate (api.ts:178) ← app/(app)/employees/[id].tsx, employeesApi.reactivate (api.ts:179) ← app/(app)/employees/[id].tsx |
| DELETE /:id | 155 | employees | Employee (w), EpfEsic, SalaryIncentive, SalaryPayment | — | employeesApi.permanentDelete (api.ts:180) ← app/(app)/employees/[id].tsx |

### inventory — `/api/inventory` — src/routes/inventory.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 19 | inventory | Inventory, InventoryMedia, Stock | — | inventoryApi.list (api.ts:136) ← app/(app)/inventory/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx, components/OrderFormSheet.tsx, components/PurchaseFormSheet.tsx, components/StockEntryFormSheet.tsx |
| GET /categories | 98 | inventory | Inventory | — | inventoryApi.categories (api.ts:144) ← components/InventoryFormSheet.tsx |
| GET /:id | 115 | inventory | Inventory, InventoryMedia, Stock | calcStock | inventoryApi.detail (api.ts:138) ← app/(app)/inventory/[id].tsx, components/StockEntryFormSheet.tsx |
| POST / | 152 | inventory | Inventory (w), Stock (w) | — | inventoryApi.create (api.ts:139) ← components/InventoryFormSheet.tsx |
| PUT /:id | 209 | inventory | Inventory (w) | — | inventoryApi.update (api.ts:140) ← app/(app)/inventory/[id].tsx, components/InventoryFormSheet.tsx |
| DELETE /:id | 236 | inventory | Inventory (w), OrderItem | — | inventoryApi.deactivate (api.ts:142) ← app/(app)/inventory/[id].tsx |
| DELETE /:id/permanent | 264 | inventory | Inventory (w), OrderItem, Stock | — | inventoryApi.permanentDelete (api.ts:143) ← app/(app)/inventory/[id].tsx |

### orders — `/api/orders` — src/routes/orders.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 22 | orders | Order | — | ordersApi.list (api.ts:243) ← app/(app)/orders/index.tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx |
| GET /:id | 50 | orders | Order | — | ordersApi.detail (api.ts:245) ← app/(app)/orders/[id].tsx, components/EstimateFormSheet.tsx, components/InvoiceFormSheet.tsx |
| POST / | 173 | orders | GstRecord (w), Invoice (w), Order (w) | calcItemTotals, nextOrderNo, nextInvoiceNoTx, calcInvoiceTotals, readVendorWorks | ordersApi.create (api.ts:246) ← components/OrderFormSheet.tsx |
| PUT /:id | 271 | orders | Order (w), OrderItem (w), OrderVendorWork (w), OrderPayment | calcItemTotals, readVendorWorks | ordersApi.update (api.ts:247) ← components/OrderFormSheet.tsx |
| DELETE /:id | 345 | orders | Order (w), OrderItem (w), OrderMedia (w), OrderPayment (w) | deleteFromMinio | ordersApi.remove (api.ts:248) ← app/(app)/orders/[id].tsx |
| POST /:id/payments | 373 | orders | OrderPayment (w) | recalcOrderPaid | ordersApi.addPayment (api.ts:249) ← components/PaymentFormSheet.tsx |
| PUT /:id/payments/:paymentId | 398 | orders | OrderPayment (w) | recalcOrderPaid | ordersApi.updatePayment (api.ts:250) ← components/PaymentFormSheet.tsx |
| DELETE /:id/payments/:paymentId | 436 | orders | OrderPayment (w) | recalcOrderPaid | ordersApi.removePayment (api.ts:251) ← components/PaymentFormSheet.tsx |

### invoices — `/api/invoices` — src/routes/invoices.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 107 | invoices | Invoice | — | invoicesApi.list (api.ts:257) ← app/(app)/invoices/index.tsx |
| GET /:id | 134 | invoices | Invoice | — | invoicesApi.detail (api.ts:259) ← app/(app)/invoices/[id].tsx |
| POST /:id/send-whatsapp | 151 | invoices | Invoice | whatsappConfigError, normalizeIndianMobile, uploadMedia, sendInvoiceTemplate, logWhatsapp, renderInvoicePdf | invoicesApi.sendWhatsapp (api.ts:266) ← app/(app)/invoices/[id].tsx |
| POST / | 205 | invoices | Invoice (w), Order | nextInvoiceNo, calcItems, invalidDiscountPercentError, applyDiscount, invalidInventoryIdsError | invoicesApi.create (api.ts:260) ← components/InvoiceFormSheet.tsx |
| PUT /:id | 263 | invoices | Invoice (w), InvoiceItem (w), Order | calcItems, invalidDiscountPercentError, applyDiscount, invalidInventoryIdsError | invoicesApi.update (api.ts:261) ← components/InvoiceFormSheet.tsx |
| DELETE /:id | 342 | invoices | Invoice (w), InvoiceMedia | deleteFromMinio | invoicesApi.remove (api.ts:262) ← app/(app)/invoices/[id].tsx |

### purchases — `/api/purchases` — src/routes/purchases.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 135 | purchases | Purchase | — | purchasesApi.list (api.ts:273) ← app/(app)/purchases/index.tsx |
| GET /:id | 159 | purchases | Purchase | — | purchasesApi.detail (api.ts:275) ← app/(app)/purchases/[id].tsx |
| POST / | 178 | purchases | Purchase (w) | calcTotals, derivePaymentStatus, applyStockTransition | purchasesApi.create (api.ts:276) ← components/PurchaseFormSheet.tsx |
| PUT /:id | 244 | purchases | Purchase (w), PurchaseItem (w) | calcTotals, derivePaymentStatus, d, applyStockTransition | purchasesApi.update (api.ts:277) ← components/PurchaseFormSheet.tsx |
| DELETE /:id | 370 | purchases | Purchase (w) | d, applyStockTransition | purchasesApi.remove (api.ts:278) ← app/(app)/purchases/[id].tsx |

### hr — `/api/hr` — src/routes/hr.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /attendance | 18 | hr.attendance | EmployeeAttendance | — | hrApi.attendance.list (api.ts:318) ← app/(app)/hr/attendance.tsx, app/(app)/hr/employee-attendance.tsx |
| POST /attendance | 51 | hr.attendance | EmployeeAttendance (w) | — | not called by the app |
| GET /attendance/day | 83 | hr.attendance | Employee, EmployeeAttendance | — | hrApi.attendance.day (api.ts:321) ← app/(app)/hr/attendance.tsx |
| POST /attendance/bulk | 103 | hr.attendance | EmployeeAttendance (w) | — | hrApi.attendance.bulkMark (api.ts:322) ← app/(app)/hr/attendance.tsx |
| GET /attendance/summary/month | 156 | hr.attendance | Employee, EmployeeAttendance | — | hrApi.attendance.monthSummary (api.ts:327) ← app/(app)/hr/attendance.tsx |
| GET /attendance/summary/year | 194 | hr.attendance | Employee, EmployeeAttendance | — | hrApi.attendance.yearSummary (api.ts:329) ← app/(app)/hr/employee-attendance.tsx |
| GET /attendance/:id | 227 | hr.attendance | EmployeeAttendance | — | hrApi.attendance.detail (api.ts:320) ← not called |
| PUT /attendance/:id | 247 | hr.attendance | EmployeeAttendance (w) | — | hrApi.attendance.update (api.ts:324) ← components/AttendanceEditSheet.tsx |
| DELETE /attendance/:id | 290 | hr.attendance | EmployeeAttendance (w) | — | hrApi.attendance.remove (api.ts:326) ← components/AttendanceEditSheet.tsx |
| GET /salary-components | 305 | hr.salary-components | SalaryComponent | — | hrApi.salaryComponents.list (api.ts:333) ← app/(app)/hr/salary-components.tsx |
| POST /salary-components | 330 | hr.salary-components | SalaryComponent (w) | — | hrApi.salaryComponents.create (api.ts:335) ← components/SalaryComponentFormSheet.tsx |
| GET /salary-components/payroll | 438 | hr.salary-components | — | computeMonthPayroll | hrApi.salaryComponents.payroll (api.ts:340) ← app/(app)/hr/salary-components.tsx |
| PUT /salary-components/:id | 449 | hr.salary-components | SalaryComponent (w) | — | hrApi.salaryComponents.update (api.ts:337) ← components/SalaryComponentFormSheet.tsx |
| DELETE /salary-components/:id | 473 | hr.salary-components | SalaryComponent (w) | — | hrApi.salaryComponents.remove (api.ts:339) ← components/SalaryComponentFormSheet.tsx |
| GET /salary-payments | 488 | hr.salary-payments | SalaryPayment | — | hrApi.salaryPayments.list (api.ts:344) ← not called |
| POST /salary-payments | 517 | hr.salary-payments | SalaryPayment (w) | computeMonthPayroll | hrApi.salaryPayments.create (api.ts:347) ← components/SalaryPaymentSheet.tsx |
| GET /salary-payments/by-employee | 559 | hr.salary-payments | — | computeMonthPayroll | hrApi.salaryPayments.byEmployee (api.ts:352) ← app/(app)/hr/salary-payments.tsx |
| PUT /salary-payments/:id | 572 | hr.salary-payments | SalaryPayment (w) | computeMonthPayroll | hrApi.salaryPayments.update (api.ts:349) ← components/SalaryPaymentSheet.tsx |
| DELETE /salary-payments/:id | 609 | hr.salary-payments | SalaryPayment (w) | — | hrApi.salaryPayments.remove (api.ts:351) ← components/SalaryPaymentSheet.tsx |
| GET /salary-payments/:id | 622 | hr.salary-payments | SalaryPayment | — | hrApi.salaryPayments.detail (api.ts:346) ← not called |
| GET /incentives | 640 | hr.incentives | SalaryIncentive | — | hrApi.incentives.list (api.ts:356) ← app/(app)/hr/incentives.tsx |
| POST /incentives | 669 | hr.incentives | SalaryIncentive (w) | — | not called by the app |
| GET /epf-esic | 696 | hr.epf-esic | EpfEsic | — | hrApi.epfEsic.list (api.ts:360) ← app/(app)/hr/epf-esic.tsx |
| POST /epf-esic | 721 | hr.epf-esic | EpfEsic (w) | — | not called by the app |
| GET /epf-esic/:id | 752 | hr.epf-esic | EpfEsic | — | hrApi.epfEsic.detail (api.ts:362) ← not called |

### estimates — `/api/estimates` — src/routes/estimates.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 71 | estimates | Estimate | — | estimatesApi.list (api.ts:284) ← app/(app)/estimates/index.tsx |
| GET /:id | 108 | estimates | Estimate | — | estimatesApi.detail (api.ts:286) ← app/(app)/estimates/[id].tsx |
| POST / | 124 | estimates | Estimate (w), Order | nextEstimateNo, calcItems, invalidInventoryIdsError, invalidDiscountPercentError, applyDiscount | estimatesApi.create (api.ts:287) ← components/EstimateFormSheet.tsx |
| PUT /:id | 175 | estimates | Estimate (w), EstimateItem (w), Order | calcItems, invalidInventoryIdsError, invalidDiscountPercentError, applyDiscount | estimatesApi.update (api.ts:288) ← components/EstimateFormSheet.tsx |
| DELETE /:id | 235 | estimates | Estimate (w) | — | estimatesApi.remove (api.ts:289) ← app/(app)/estimates/[id].tsx |

### gst — `/api/gst` — src/routes/gst.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | gst | GstRecord | — | gstApi.list (api.ts:306) ← app/(app)/gst/index.tsx |
| GET /:id | 52 | gst | GstRecord | — | gstApi.detail (api.ts:308) ← app/(app)/gst/[id].tsx |
| POST / | 87 | gst | GstRecord (w) | splitGst | gstApi.create (api.ts:309) ← components/GstFormSheet.tsx |
| PUT /:id | 132 | gst | GstRecord (w) | splitGst | gstApi.update (api.ts:310) ← components/GstFormSheet.tsx |
| DELETE /:id | 179 | gst | GstRecord (w) | — | gstApi.remove (api.ts:311) ← app/(app)/gst/[id].tsx |

### stock — `/api/stock` — src/routes/stock.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 32 | stock | Stock | — | stockApi.list (api.ts:295) ← app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |
| POST / | 79 | stock | Stock (w) | currentStockForItem | stockApi.create (api.ts:297) ← components/StockEntryFormSheet.tsx, components/StockMovementSheet.tsx |
| PUT /:id | 131 | stock | Stock (w) | currentStockForItem | stockApi.update (api.ts:298) ← components/StockEntryFormSheet.tsx |
| DELETE /:id | 186 | stock | Stock (w) | currentStockForItem | stockApi.remove (api.ts:300) ← app/(app)/inventory/[id].tsx, app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |

### vehicles — `/api/vehicles` — src/routes/vehicles.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | vehicles | Vehicle | — | vehiclesApi.list (api.ts:369) ← app/(app)/vehicles/index.tsx |
| GET /:id | 40 | vehicles | Vehicle | — | vehiclesApi.detail (api.ts:371) ← app/(app)/vehicles/[id].tsx |

### maintenance — `/api/maintenance` — src/routes/maintenance.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 10 | maintenance | MaintenancePeriod | — | maintenanceApi.list (api.ts:401) ← app/(app)/maintenance/index.tsx |
| GET /fd-alerts | 35 | maintenance | FdAlert | — | maintenanceApi.fdAlerts (api.ts:403) ← not called |

### media — `/api/media` — src/routes/media.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| POST /upload | 95 | requireEntityPermission (media.ts:86) | — | keyToUrl, getModel, getFk, serializeMedia, getEntityFolderName, compressImage | direct /api/media/upload ← hooks/useMediaUpload.ts |
| DELETE /:entity/:id | 156 | requireEntityPermission (media.ts:86) | — | deleteFromMinio, getModel | direct /api/media/:/: ← components/MediaSection.tsx |
| GET /presign/:entity/:id | 177 | requireEntityPermission (media.ts:86) | — | getPresignedUrl, getModel | direct /api/media/presign/inventory/: ← app/(app)/inventory/index.tsx, direct /api/media/presign/:/: ← components/MediaSection.tsx |
| PUT /inventory/:mediaId/primary | 197 | inventory | InventoryMedia (w) | — | direct /api/media/inventory/:/primary ← components/MediaSection.tsx |

### calendar — `/api/calendar` — src/routes/calendar.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET / | 29 | calendar or calendar-write or calendar-manage | CalendarEvent, Order | — | calendarApi.list (api.ts:394) ← components/DashboardCalendar.tsx |
| POST / | 69 | calendar-write or calendar-manage | CalendarEvent (w) | — | calendarApi.create (api.ts:395) ← components/DashboardCalendar.tsx |
| PUT /:id | 94 | calendar-write or calendar-manage | CalendarEvent (w) | canManageAny | calendarApi.update (api.ts:396) ← components/DashboardCalendar.tsx |
| DELETE /:id | 123 | calendar-write or calendar-manage | CalendarEvent (w) | canManageAny | calendarApi.remove (api.ts:397) ← components/DashboardCalendar.tsx |

### ledger — `/api/ledger` — src/routes/ledger.ts

| Endpoint | Line | Permission | Tables | Calls | App function → used by |
|---|---|---|---|---|---|
| GET /receivables | 51 | ledger | Customer | todayKey, loadLedgerData | ledgerApi.receivables (api.ts:92) ← app/(app)/finance.tsx, app/(app)/ledger/index.tsx |
| GET /customers/:id | 96 | ledger | Customer | loadLedgerData, buildStatement, buildPosition, validDate, parseId | ledgerApi.customer (api.ts:94) ← app/(app)/customers/[id].tsx, app/(app)/ledger/[id].tsx |
| PUT /customers/:id/opening-balance | 134 | ledger | Customer (w) | validDate, parseId | ledgerApi.setOpeningBalance (api.ts:96) ← components/LedgerEntrySheet.tsx |
| GET /customers/:id/due-orders | 165 | ledger | — | loadDueOrders, parseId | ledgerApi.dueOrders (api.ts:98) ← components/ReceiptFormSheet.tsx |
| POST /customers/:id/receipts | 185 | ledger | CustomerReceipt (w), OrderPayment (w), Customer, raw SQL | recalcOrderPaid, loadDueOrders, validDate, parseAmount, parseId, nextReceiptNo | ledgerApi.createReceipt (api.ts:100) ← components/ReceiptFormSheet.tsx |
| DELETE /receipts/:id | 285 | ledger | CustomerReceipt (w), OrderPayment (w) | recalcOrderPaid, parseId | ledgerApi.deleteReceipt (api.ts:102) ← app/(app)/ledger/[id].tsx |
| POST /customers/:id/entries | 320 | ledger | CustomerLedgerEntry (w) | parseId, readEntry | ledgerApi.createEntry (api.ts:103) ← components/LedgerEntrySheet.tsx |
| PUT /entries/:id | 336 | ledger | CustomerLedgerEntry (w) | parseId, readEntry | ledgerApi.updateEntry (api.ts:104) ← components/LedgerEntrySheet.tsx |
| DELETE /entries/:id | 352 | ledger | CustomerLedgerEntry (w) | parseId | ledgerApi.deleteEntry (api.ts:105) ← components/LedgerEntrySheet.tsx |

## 3. Screens (Expo Router, `app/`)

| Route | File | API functions | Components | Feature guard |
|---|---|---|---|---|
| / (layout) | app/_layout.tsx | — | — | — |
| / (layout) | app/(app)/_layout.tsx | — | WebTopNav | — |
| /admin (layout) | app/(app)/admin/_layout.tsx | — | — | — |
| /admin/groups | app/(app)/admin/groups.tsx | adminApi.groups.list, adminApi.groups.remove | GroupFormSheet | — |
| /admin | app/(app)/admin/index.tsx | adminApi.groups.list, adminApi.users.list | — | — |
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
| /ledger/[id] | app/(app)/ledger/[id].tsx | ledgerApi.customer, ledgerApi.deleteReceipt | DatePickerModal, LedgerEntrySheet, ReceiptFormSheet | — |
| /ledger | app/(app)/ledger/index.tsx | ledgerApi.receivables | Breadcrumbs | — |
| /maintenance (layout) | app/(app)/maintenance/_layout.tsx | — | HubBackButton | 'maintenance' |
| /maintenance | app/(app)/maintenance/index.tsx | maintenanceApi.list | Breadcrumbs | — |
| /orders (layout) | app/(app)/orders/_layout.tsx | — | HubBackButton | 'orders' |
| /orders/[id] | app/(app)/orders/[id].tsx | ordersApi.detail, ordersApi.remove | InvoiceFormSheet, MediaSection, OrderFormSheet, PaymentFormSheet | — |
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
| components/DashboardCalendar.tsx | calendarApi.create, calendarApi.list, calendarApi.remove, calendarApi.update | app/(app)/index.tsx |
| components/DatePickerModal.tsx | — | app/(app)/ledger/[id].tsx |
| components/EmployeeFormSheet.tsx | employeesApi.create, employeesApi.update | app/(app)/employees/[id].tsx, app/(app)/employees/index.tsx |
| components/EstimateFormSheet.tsx | customersApi.list, estimatesApi.create, estimatesApi.update, inventoryApi.list, ordersApi.detail, ordersApi.list, projectsApi.list | app/(app)/estimates/[id].tsx, app/(app)/estimates/index.tsx |
| components/GroupFormSheet.tsx | adminApi.features, adminApi.groups.create, adminApi.groups.setPermissions, adminApi.groups.update | app/(app)/admin/groups.tsx |
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
| components/RevenueChart.tsx | dashboardApi.getRevenue | app/(app)/index.tsx |
| components/SalaryComponentFormSheet.tsx | employeesApi.list, hrApi.salaryComponents.create, hrApi.salaryComponents.remove, hrApi.salaryComponents.update | app/(app)/hr/salary-components.tsx |
| components/SalaryPaymentSheet.tsx | hrApi.salaryPayments.create, hrApi.salaryPayments.remove, hrApi.salaryPayments.update | app/(app)/hr/salary-components.tsx, app/(app)/hr/salary-payments.tsx |
| components/SearchPickerModal.tsx | — | not imported |
| components/StockEntryFormSheet.tsx | inventoryApi.detail, inventoryApi.list, stockApi.create, stockApi.update | app/(app)/inventory/stock.tsx, app/(app)/purchases/[id].tsx |
| components/StockMovementSheet.tsx | stockApi.create | app/(app)/inventory/[id].tsx |
| components/TenderFormSheet.tsx | tendersApi.create, tendersApi.update | app/(app)/tenders/[id].tsx, app/(app)/tenders/index.tsx |
| components/UserFormSheet.tsx | adminApi.groups.list, adminApi.users.create, adminApi.users.setGroups, adminApi.users.update | app/(app)/admin/users.tsx |
| components/VendorFormSheet.tsx | vendorsApi.create, vendorsApi.update | app/(app)/vendors/[id].tsx, app/(app)/vendors/index.tsx |
| components/WebHubPage.tsx | — | app/(app)/finance.tsx, app/(app)/people.tsx, app/(app)/work.tsx |
| components/WebTopNav.tsx | — | app/(app)/_layout.tsx |
| hooks/useMediaUpload.ts | direct /api/media/upload | — |
| store/auth.ts | authApi.login, authApi.logout, authApi.me | — |

## 5. Data models (`prisma/schema.prisma`)

| Model | Table | Line | Unique | Links to | Written by | Read by |
|---|---|---|---|---|---|---|
| User | users | 16 | username | CalendarEvent[], SalaryIncentive[], SalaryPayment[], UserGroup[] | routes/admin.ts, routes/auth.ts | middleware/permissions.ts, routes/dashboard.ts |
| Group | groups | 46 | name | GroupPermission[], UserGroup[] | routes/admin.ts | — |
| UserGroup | user_groups | 60 | — | Group, User | routes/admin.ts | routes/auth.ts |
| GroupPermission | group_permissions | 72 | — | Group | routes/admin.ts | — |
| Customer | customers | 85 | customerCode | CustomerLedgerEntry[], CustomerReceipt[], Estimate[], GstRecord[], Invoice[], Order[], WhatsappMessage[] | routes/customers.ts, routes/ledger.ts | lib/ledger.ts, lib/whatsappBot.ts, routes/dashboard.ts |
| Tender | tenders | 116 | tenderNo | Project[], TenderMedia[] | routes/tenders.ts | routes/dashboard.ts, routes/media.ts, routes/projects.ts |
| Project | projects | 140 | projectNo | EmployeeAttendance[], Estimate[], Invoice[], MaintenancePeriod[], Order[], ProjectPhotograph[], SalaryIncentive[], Tender, VehicleUsage[] | routes/projects.ts | routes/dashboard.ts, routes/tenders.ts |
| Vendor | vendors | 168 | vendorCode | GstRecord[], Invoice[], OrderVendorWork[], Purchase[] | routes/vendors.ts | routes/dashboard.ts, routes/orders.ts |
| Employee | employees | 195 | employeeCode | EmployeeAttendance[], EpfEsic[], SalaryComponent[], SalaryIncentive[], SalaryPayment[] | routes/employees.ts | routes/dashboard.ts, routes/hr.ts |
| Inventory | inventory | 223 | itemCode | EstimateItem[], InventoryMedia[], InvoiceItem[], OrderItem[], PurchaseItem[], Stock[] | routes/inventory.ts, routes/purchases.ts | routes/dashboard.ts, routes/estimates.ts, routes/invoices.ts, routes/media.ts |
| Stock | stocks | 246 | — | Inventory | routes/inventory.ts, routes/purchases.ts, routes/stock.ts | routes/dashboard.ts |
| Order | orders | 274 | orderNo | Customer, Estimate[], Invoice[], OrderItem[], OrderMedia[], OrderPayment[], OrderVendorWork[], Project | lib/ledger.ts, routes/orders.ts | lib/whatsappBot.ts, routes/calendar.ts, routes/customers.ts, routes/dashboard.ts, routes/estimates.ts, routes/invoices.ts, routes/media.ts, routes/projects.ts |
| OrderVendorWork | order_vendor_works | 306 | — | Order, Vendor | routes/orders.ts | routes/vendors.ts |
| OrderItem | order_items | 322 | — | Inventory, Order | routes/orders.ts | routes/inventory.ts |
| OrderPayment | order_payments | 339 | — | CustomerReceipt, Order | routes/ledger.ts, routes/orders.ts | lib/ledger.ts, routes/dashboard.ts |
| CustomerReceipt | customer_receipts | 366 | receiptNo | Customer, OrderPayment[] | routes/ledger.ts | lib/ledger.ts, routes/customers.ts |
| CustomerLedgerEntry | customer_ledger_entries | 386 | — | Customer | routes/ledger.ts | lib/ledger.ts, routes/customers.ts |
| Invoice | invoices | 406 | invoiceNo | Customer, InvoiceItem[], InvoiceMedia[], Order, Project, Vendor | routes/invoices.ts, routes/orders.ts | lib/whatsappBot.ts, routes/customers.ts, routes/dashboard.ts, routes/media.ts, routes/projects.ts, routes/vendors.ts |
| InvoiceItem | invoice_items | 444 | — | Inventory, Invoice | routes/invoices.ts | — |
| Purchase | purchases | 462 | purchaseNo | PurchaseItem[], Vendor | routes/purchases.ts | routes/dashboard.ts, routes/vendors.ts |
| PurchaseItem | purchase_items | 485 | — | Inventory, Purchase | routes/purchases.ts | — |
| EmployeeAttendance | employee_attendances | 508 | — | Employee, Project | routes/hr.ts | routes/dashboard.ts |
| SalaryComponent | salary_components | 527 | — | Employee | routes/hr.ts | — |
| SalaryPayment | salary_payments | 545 | — | Employee, User | routes/hr.ts | routes/dashboard.ts, routes/employees.ts |
| SalaryIncentive | salary_incentives | 567 | — | Employee, Project, User | routes/hr.ts | routes/dashboard.ts, routes/employees.ts |
| EpfEsic | epf_esic | 588 | — | Employee | routes/hr.ts | routes/employees.ts |
| Estimate | estimates | 615 | estimateNo | Customer, EstimateItem[], Order, Project | routes/estimates.ts | routes/customers.ts, routes/dashboard.ts, routes/projects.ts |
| EstimateItem | estimate_items | 642 | — | Estimate, Inventory | routes/estimates.ts | — |
| GstRecord | gst_records | 659 | — | Customer, Vendor | routes/gst.ts, routes/orders.ts | routes/dashboard.ts |
| TenderMedia | tender_media | 688 | — | Tender | — | routes/tenders.ts |
| InvoiceMedia | invoice_media | 702 | — | Invoice | — | routes/invoices.ts |
| InventoryMedia | inventory_media | 716 | — | Inventory | routes/media.ts | routes/inventory.ts |
| OrderMedia | order_media | 731 | — | Order | routes/orders.ts | — |
| MaintenancePeriod | maintenance_periods | 747 | — | FdAlert[], Project | — | routes/dashboard.ts, routes/maintenance.ts |
| FdAlert | fd_alerts | 762 | — | MaintenancePeriod | — | routes/maintenance.ts |
| ProjectPhotograph | project_photographs | 779 | — | Project | — | — |
| Vehicle | vehicles | 796 | vehicleNo | VehicleUsage[] | — | routes/dashboard.ts, routes/vehicles.ts |
| VehicleUsage | vehicle_usages | 819 | — | Project, Vehicle | — | — |
| CalendarEvent | calendar_events | 845 | — | User | routes/calendar.ts | — |
| WhatsappMessage | whatsapp_messages | 867 | waMessageId | Customer | lib/whatsappBot.ts, lib/whatsappLog.ts | — |

## 6. Backend helpers

Exported from `src/lib`, `src/utils`, `src/middleware`, plus functions local to a route file.

| Function | File:line | Tables | Calls | Called from |
|---|---|---|---|---|
| dayKey | src/lib/ledger.ts:33 | — | — | lib/ledger.ts |
| todayKey | src/lib/ledger.ts:36 | — | dayKey | lib/ledger.ts, lib/whatsappBot.ts, routes/ledger.ts, utils/statementPdf.ts |
| emptyData | src/lib/ledger.ts:62 | — | — | lib/ledger.ts |
| loadLedgerData | src/lib/ledger.ts:68 | Customer, CustomerLedgerEntry, CustomerReceipt, Order, OrderPayment | dayKey, emptyData | lib/whatsappBot.ts, routes/ledger.ts |
| modeText | src/lib/ledger.ts:156 | — | — | lib/ledger.ts |
| fmtRupees | src/lib/ledger.ts:161 | — | — | lib/ledger.ts |
| buildRawLines | src/lib/ledger.ts:167 | — | modeText, fmtRupees | lib/ledger.ts |
| buildStatement | src/lib/ledger.ts:256 | — | buildRawLines | lib/whatsappBot.ts, routes/ledger.ts |
| buildPosition | src/lib/ledger.ts:300 | — | todayKey | lib/whatsappBot.ts, routes/ledger.ts |
| recalcOrderPaid | src/lib/ledger.ts:376 | Order (w), OrderPayment | — | routes/ledger.ts, routes/orders.ts |
| loadDueOrders | src/lib/ledger.ts:388 | Order, OrderPayment | dayKey | routes/ledger.ts |
| fileUrlToKey | src/lib/minio.ts:20 | — | — | lib/minio.ts |
| keyToUrl | src/lib/minio.ts:27 | — | — | routes/media.ts |
| deleteFromMinio | src/lib/minio.ts:35 | — | fileUrlToKey | routes/invoices.ts, routes/media.ts, routes/orders.ts, routes/tenders.ts |
| getPresignedUrl | src/lib/minio.ts:40 | — | fileUrlToKey | routes/media.ts |
| buildUrl | src/lib/prisma.ts:19 | — | — | not called |
| whatsappConfigError | src/lib/whatsapp.ts:40 | — | — | lib/whatsapp.ts, routes/invoices.ts |
| requireConfig | src/lib/whatsapp.ts:47 | — | whatsappConfigError | lib/whatsapp.ts |
| normalizeIndianMobile | src/lib/whatsapp.ts:79 | — | — | lib/whatsappBot.ts, routes/invoices.ts |
| metaFetch | src/lib/whatsapp.ts:86 | — | requireConfig | lib/whatsapp.ts |
| uploadMedia | src/lib/whatsapp.ts:107 | — | metaFetch | lib/whatsappBot.ts, routes/invoices.ts |
| sendMessage | src/lib/whatsapp.ts:116 | — | metaFetch | lib/whatsapp.ts |
| sendInvoiceTemplate | src/lib/whatsapp.ts:128 | — | sendMessage | routes/invoices.ts |
| sendText | src/lib/whatsapp.ts:151 | — | sendMessage | lib/whatsappBot.ts |
| sendButtons | src/lib/whatsapp.ts:156 | — | sendMessage | not called |
| sendList | src/lib/whatsapp.ts:169 | — | sendMessage | lib/whatsappBot.ts |
| sendDocument | src/lib/whatsapp.ts:195 | — | sendMessage | lib/whatsappBot.ts |
| verifyWebhookSignature | src/lib/whatsapp.ts:201 | — | — | routes/whatsappWebhook.ts |
| enqueueWebhook | src/lib/whatsappBot.ts:47 | — | processWebhook | routes/whatsappWebhook.ts |
| processWebhook | src/lib/whatsappBot.ts:53 | — | applyStatus, handleMessage | lib/whatsappBot.ts |
| applyStatus | src/lib/whatsappBot.ts:72 | WhatsappMessage (w) | — | lib/whatsappBot.ts |
| findCustomersByPhone | src/lib/whatsappBot.ts:91 | Customer | normalizeIndianMobile | lib/whatsappBot.ts |
| handleMessage | src/lib/whatsappBot.ts:105 | WhatsappMessage | sendText, sendList, findCustomersByPhone, sendMenu, reply, pendingSummary, ordersSummary, invoiceRows, sendInvoicePdf, paymentsSummary, sendStatements, logWhatsapp | lib/whatsappBot.ts |
| sendMenu | src/lib/whatsappBot.ts:175 | — | sendList, reply | lib/whatsappBot.ts |
| reply | src/lib/whatsappBot.ts:179 | — | logWhatsapp | lib/whatsappBot.ts |
| rs | src/lib/whatsappBot.ts:191 | — | — | lib/whatsappBot.ts |
| day | src/lib/whatsappBot.ts:194 | — | — | lib/whatsappBot.ts |
| withActivity | src/lib/whatsappBot.ts:203 | — | — | lib/whatsappBot.ts |
| pendingSummary | src/lib/whatsappBot.ts:213 | — | loadLedgerData, buildStatement, buildPosition, rs, day, withActivity | lib/whatsappBot.ts |
| ordersSummary | src/lib/whatsappBot.ts:233 | Order | rs, day | lib/whatsappBot.ts |
| invoiceRows | src/lib/whatsappBot.ts:258 | Invoice | rs, day | lib/whatsappBot.ts |
| sendInvoicePdf | src/lib/whatsappBot.ts:274 | Invoice | uploadMedia, sendDocument, reply, rs, day, renderInvoicePdf | lib/whatsappBot.ts |
| paymentsSummary | src/lib/whatsappBot.ts:293 | — | loadLedgerData, buildStatement, rs, day, withActivity | lib/whatsappBot.ts |
| currentFy | src/lib/whatsappBot.ts:314 | — | todayKey | lib/whatsappBot.ts |
| sendStatements | src/lib/whatsappBot.ts:321 | — | loadLedgerData, buildStatement, buildPosition, uploadMedia, sendDocument, reply, rs, withActivity, currentFy, renderStatementPdf | lib/whatsappBot.ts |
| logWhatsapp | src/lib/whatsappLog.ts:5 | WhatsappMessage (w) | — | lib/whatsappBot.ts, routes/invoices.ts |
| requireAuth | src/middleware/auth.ts:14 | — | — | route middleware |
| requireStaff | src/middleware/auth.ts:40 | — | — | route middleware |
| invalidateUserAccess | src/middleware/permissions.ts:25 | — | — | routes/admin.ts, routes/auth.ts |
| invalidateAllAccess | src/middleware/permissions.ts:29 | — | — | routes/admin.ts |
| getEffectiveAccess | src/middleware/permissions.ts:33 | User | — | middleware/permissions.ts, routes/calendar.ts |
| featureSatisfied | src/middleware/permissions.ts:65 | — | — | middleware/permissions.ts, routes/calendar.ts |
| getPermissionKeys | src/middleware/permissions.ts:78 | — | getEffectiveAccess, featureSatisfied | routes/auth.ts |
| requirePermission | src/middleware/permissions.ts:87 | — | getEffectiveAccess, featureSatisfied | route middleware |
| requireAnyPermission | src/middleware/permissions.ts:119 | — | getEffectiveAccess, featureSatisfied | route middleware |
| requireSuperAdmin | src/middleware/permissions.ts:148 | — | getEffectiveAccess | route middleware |
| serializeUser | src/routes/admin.ts:18 | — | — | routes/admin.ts |
| serializeGroup | src/routes/admin.ts:199 | — | — | routes/admin.ts |
| canManageAny | src/routes/calendar.ts:15 | — | getEffectiveAccess, featureSatisfied | routes/calendar.ts |
| nextCustomerCode | src/routes/customers.ts:73 | Customer | — | routes/customers.ts |
| withCustomerNames | src/routes/dashboard.ts:147 | Customer | — | routes/dashboard.ts |
| nextEstimateNo | src/routes/estimates.ts:15 | Estimate | — | routes/estimates.ts |
| calcItems | src/routes/estimates.ts:35 | — | — | routes/estimates.ts |
| invalidInventoryIdsError | src/routes/estimates.ts:50 | Inventory | — | routes/estimates.ts |
| invalidDiscountPercentError | src/routes/estimates.ts:59 | — | — | routes/estimates.ts |
| applyDiscount | src/routes/estimates.ts:64 | — | — | routes/estimates.ts |
| splitGst | src/routes/gst.ts:80 | — | — | routes/gst.ts |
| computeMonthPayroll | src/routes/hr.ts:359 | Employee, EmployeeAttendance, SalaryComponent, SalaryPayment | — | routes/hr.ts |
| calcStock | src/routes/inventory.ts:9 | — | — | routes/inventory.ts |
| nextInvoiceNo | src/routes/invoices.ts:25 | Invoice | — | routes/invoices.ts |
| calcItems | src/routes/invoices.ts:58 | — | — | routes/invoices.ts |
| invalidDiscountPercentError | src/routes/invoices.ts:76 | — | — | routes/invoices.ts |
| applyDiscount | src/routes/invoices.ts:81 | — | — | routes/invoices.ts |
| invalidInventoryIdsError | src/routes/invoices.ts:91 | Inventory | — | routes/invoices.ts |
| validDate | src/routes/ledger.ts:17 | — | — | routes/ledger.ts |
| parseAmount | src/routes/ledger.ts:22 | — | — | routes/ledger.ts |
| parseId | src/routes/ledger.ts:28 | — | — | routes/ledger.ts |
| nextReceiptNo | src/routes/ledger.ts:35 | CustomerReceipt | — | routes/ledger.ts |
| readEntry | src/routes/ledger.ts:309 | — | validDate, parseAmount | routes/ledger.ts |
| getModel | src/routes/media.ts:30 | — | — | routes/media.ts |
| getFk | src/routes/media.ts:40 | — | — | routes/media.ts |
| serializeMedia | src/routes/media.ts:44 | — | — | routes/media.ts |
| getEntityFolderName | src/routes/media.ts:50 | Inventory, Invoice, Order, Tender | — | routes/media.ts |
| compressImage | src/routes/media.ts:72 | — | — | routes/media.ts |
| requireEntityPermission | src/routes/media.ts:86 | — | — | not called |
| calcItemTotals | src/routes/orders.ts:69 | — | — | routes/orders.ts |
| nextOrderNo | src/routes/orders.ts:104 | Order | — | routes/orders.ts |
| nextInvoiceNoTx | src/routes/orders.ts:115 | Invoice | — | routes/orders.ts |
| calcInvoiceTotals | src/routes/orders.ts:131 | — | — | routes/orders.ts |
| readVendorWorks | src/routes/orders.ts:154 | Vendor | — | routes/orders.ts |
| parseDateField | src/routes/projects.ts:15 | — | — | routes/projects.ts |
| calcTotals | src/routes/purchases.ts:16 | — | — | routes/purchases.ts |
| derivePaymentStatus | src/routes/purchases.ts:25 | — | — | routes/purchases.ts |
| d | src/routes/purchases.ts:31 | — | — | routes/purchases.ts |
| ensureInventoryItem | src/routes/purchases.ts:40 | Inventory (w) | — | routes/purchases.ts |
| applyStockTransition | src/routes/purchases.ts:71 | PurchaseItem (w), Stock (w) | d, ensureInventoryItem | routes/purchases.ts |
| calcStock | src/routes/stock.ts:13 | — | — | routes/stock.ts |
| currentStockForItem | src/routes/stock.ts:22 | Stock | calcStock | routes/stock.ts |
| parseDateField | src/routes/tenders.ts:22 | — | — | routes/tenders.ts |
| validateTenderFields | src/routes/tenders.ts:94 | — | — | routes/tenders.ts |
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
| renderStatementPdf | src/utils/statementPdf.ts:175 | — | renderHtmlToPdf, buildStatementHtml | lib/whatsappBot.ts |

## 7. Loose ends

App functions with no matching backend route (a bug, or the parser missed a pattern):

- none

App functions defined in `services/api.ts` but not called by any app file:

- dashboardApi.getCollectedByCustomer, dashboardApi.getOutstandingByCustomer, hrApi.attendance.detail, hrApi.salaryPayments.list, hrApi.salaryPayments.detail, hrApi.epfEsic.detail, maintenanceApi.fdAlerts

