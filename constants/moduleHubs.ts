// Single source of truth for where each hidden-tab module's root screen
// belongs in the app's logical structure — used by both HubBackButton
// (single-level back) and Breadcrumbs (full trail). Keeping this in one
// place means the two stay consistent instead of drifting apart.
export type HubInfo = { label: string; route: string };

export const MODULE_HUBS: Record<string, { label: string; hub: HubInfo }> = {
  orders:      { label: 'Orders',              hub: { label: 'Finance', route: '/(app)/finance' } },
  invoices:    { label: 'Invoices',             hub: { label: 'Finance', route: '/(app)/finance' } },
  purchases:   { label: 'Purchases',            hub: { label: 'Finance', route: '/(app)/finance' } },
  estimates:   { label: 'Estimates',            hub: { label: 'Finance', route: '/(app)/finance' } },
  gst:         { label: 'GST Records',          hub: { label: 'Finance', route: '/(app)/finance' } },
  stock:       { label: 'Stock Ledger',         hub: { label: 'Finance', route: '/(app)/finance' } },
  tenders:     { label: 'Tenders',              hub: { label: 'Work',    route: '/(app)/work' } },
  projects:    { label: 'Projects',             hub: { label: 'Work',    route: '/(app)/work' } },
  vehicles:    { label: 'Vehicles',             hub: { label: 'Work',    route: '/(app)/work' } },
  maintenance: { label: 'Maintenance & FD Alerts', hub: { label: 'Work', route: '/(app)/work' } },
  customers:   { label: 'Customers',            hub: { label: 'People', route: '/(app)/people' } },
  vendors:     { label: 'Vendors',              hub: { label: 'People', route: '/(app)/people' } },
  employees:   { label: 'Employees',            hub: { label: 'People', route: '/(app)/people' } },
  hr:          { label: 'HR & Payroll',         hub: { label: 'People', route: '/(app)/people' } },
};
