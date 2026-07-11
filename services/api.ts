import axios from 'axios';
import { storage } from '../utils/storage';
import { API_BASE_URL } from '../constants/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // 401 handled by auth store via useAuth hook
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login', { username, password }),
  me: () => api.get<MeResponse>('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

// ─── Admin (RBAC — super admin only) ─────────────────────────────────────────

export const adminApi = {
  features: () => api.get<{ features: FeatureDef[] }>('/api/admin/features'),
  users: {
    list: () => api.get<{ users: AdminUser[]; total: number }>('/api/admin/users'),
    create: (data: AdminUserPayload) => api.post<{ user: AdminUser }>('/api/admin/users', data),
    update: (id: number, data: Partial<AdminUserPayload>) =>
      api.put<{ user: AdminUser }>(`/api/admin/users/${id}`, data),
    setGroups: (id: number, groupIds: number[]) =>
      api.put<{ user: AdminUser }>(`/api/admin/users/${id}/groups`, { groupIds }),
  },
  groups: {
    list: () => api.get<{ groups: AdminGroup[]; total: number }>('/api/admin/groups'),
    create: (data: AdminGroupPayload) => api.post<{ group: AdminGroup }>('/api/admin/groups', data),
    update: (id: number, data: Partial<AdminGroupPayload>) =>
      api.put<{ group: AdminGroup }>(`/api/admin/groups/${id}`, data),
    remove: (id: number, force = false) =>
      api.delete<{ message: string }>(`/api/admin/groups/${id}${force ? '?force=true' : ''}`),
    setPermissions: (id: number, features: string[]) =>
      api.put<{ group: AdminGroup }>(`/api/admin/groups/${id}/permissions`, { features }),
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSummary: () => api.get<DashboardResponse>('/api/dashboard'),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<CustomerListResponse>('/api/customers', { params }),
  detail: (id: number) => api.get<CustomerDetailResponse>(`/api/customers/${id}`),
  create: (data: CustomerPayload) => api.post<CustomerDetailResponse>('/api/customers', data),
  update: (id: number, data: Partial<CustomerPayload>) =>
    api.put<CustomerDetailResponse>(`/api/customers/${id}`, data),
  deactivate: (id: number) => api.delete(`/api/customers/${id}`),
};

// ─── Tenders ──────────────────────────────────────────────────────────────────

export interface TenderPayload {
  tenderNo?: string;            // omit/blank → server auto-generates
  title: string;
  description?: string;
  status?: string;
  tenderDate: string;           // YYYY-MM-DD, required
  closingDate: string;          // required
  tenderAmount?: number | string | null;
  biddingPercentage?: number | string;
  workOrderNo?: string | null;
  maintenancePeriod?: number | null;
  tenderRemark?: string | null;
}

export const tendersApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<TenderListResponse>('/api/tenders', { params }),
  detail: (id: number) => api.get<TenderDetailResponse>(`/api/tenders/${id}`),
  create: (data: TenderPayload) => api.post<TenderDetailResponse>('/api/tenders', data),
  update: (id: number, data: Partial<TenderPayload>) => api.put<TenderDetailResponse>(`/api/tenders/${id}`, data),
  remove: (id: number) => api.delete<{ message: string }>(`/api/tenders/${id}`),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<InventoryListResponse>('/api/inventory', { params }),
  detail: (id: number) => api.get<InventoryDetailResponse>(`/api/inventory/${id}`),
  create: (data: InventoryPayload) => api.post<{ item: InventoryDetail }>('/api/inventory', data),
  update: (id: number, data: Partial<InventoryPayload>) =>
    api.put<{ item: InventoryDetail }>(`/api/inventory/${id}`, data),
  deactivate: (id: number) => api.delete(`/api/inventory/${id}`),
  permanentDelete: (id: number) => api.delete(`/api/inventory/${id}/permanent`),
  categories: () => api.get<{ categories: string[] }>('/api/inventory/categories'),
};


// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendorsApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<VendorListResponse>('/api/vendors', { params }),
  detail: (id: number) => api.get<VendorDetailResponse>(`/api/vendors/${id}`),
  create: (data: VendorPayload) => api.post<VendorDetailResponse>('/api/vendors', data),
  update: (id: number, data: Partial<VendorPayload>) =>
    api.put<VendorDetailResponse>(`/api/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/api/vendors/${id}`),
};

// ─── Employees ────────────────────────────────────────────────────────────────

export interface EmployeePayload {
  employeeCode?: string;
  name: string;
  phone?: string; email?: string; address?: string;
  aadharNo?: string; pan?: string;
  skillType?: string;
  dailyWage?: number; ctc?: number; basicSalary?: number;
  isActive?: boolean;
}

export const employeesApi = {
  list: (params?: { search?: string; skillType?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<EmployeeListResponse>('/api/employees', { params }),
  detail: (id: number) => api.get<EmployeeDetailResponse>(`/api/employees/${id}`),
  create: (data: EmployeePayload) => api.post('/api/employees', data),
  update: (id: number, data: Partial<EmployeePayload>) => api.put(`/api/employees/${id}`, data),
  deactivate: (id: number) => api.put(`/api/employees/${id}`, { isActive: false }),
  reactivate: (id: number) => api.put(`/api/employees/${id}`, { isActive: true }),
  permanentDelete: (id: number) => api.delete(`/api/employees/${id}`),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectPayload {
  name: string;
  description?: string;
  status?: string;
  budget?: number | string;
  startDate?: string | null;   // YYYY-MM-DD
  endDate?: string | null;
  tenderId?: number | null;
}

export const projectsApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ProjectListResponse>('/api/projects', { params }),
  detail: (id: number) => api.get<ProjectDetailResponse>(`/api/projects/${id}`),
  create: (data: ProjectPayload) => api.post<ProjectDetailResponse>('/api/projects', data),
  update: (id: number, data: Partial<ProjectPayload>) => api.put<ProjectDetailResponse>(`/api/projects/${id}`, data),
  remove: (id: number) => api.delete<{ message: string }>(`/api/projects/${id}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItemInput {
  inventoryId?: number | null;
  description?: string;
  quantity: string;
  unitPrice: string;
  isRental?: boolean;
  rentalDays?: number;
}
export interface OrderCreateInput {
  customerId?: number; projectId?: number;
  orderDate: string; deliveryDate?: string;
  status?: string; notes?: string;
  items?: OrderItemInput[];
}
export interface OrderUpdateInput {
  customerId?: number | null; projectId?: number | null;
  orderDate?: string; deliveryDate?: string | null;
  status?: string; notes?: string;
  items?: OrderItemInput[];
}
export interface OrderPaymentInput {
  amount: string; paymentMode: string; paymentDate: string; referenceNo?: string;
}

export const ordersApi = {
  list: (params?: { search?: string; status?: string; paymentStatus?: string; limit?: number }) =>
    api.get<OrderListResponse>('/api/orders', { params }),
  detail:     (id: number) => api.get<OrderDetailResponse>(`/api/orders/${id}`),
  create:     (data: OrderCreateInput) => api.post<{ order: OrderSummary }>('/api/orders', data),
  update:     (id: number, data: OrderUpdateInput) => api.put<{ order: OrderSummary }>(`/api/orders/${id}`, data),
  remove:     (id: number) => api.delete<{ success: boolean }>(`/api/orders/${id}`),
  addPayment:    (id: number, data: OrderPaymentInput) => api.post<{ payment: OrderPayment }>(`/api/orders/${id}/payments`, data),
  updatePayment: (id: number, paymentId: number, data: OrderPaymentInput) => api.put<{ success: boolean }>(`/api/orders/${id}/payments/${paymentId}`, data),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (params?: { search?: string; status?: string; invoiceType?: string; limit?: number }) =>
    api.get<InvoiceListResponse>('/api/invoices', { params }),
  detail: (id: number) => api.get<InvoiceDetailResponse>(`/api/invoices/${id}`),
};

// ─── Purchases ────────────────────────────────────────────────────────────────

export const purchasesApi = {
  list:   (params?: { search?: string; status?: string; paymentStatus?: string; limit?: number }) =>
    api.get<PurchaseListResponse>('/api/purchases', { params }),
  detail: (id: number) => api.get<PurchaseDetailResponse>(`/api/purchases/${id}`),
  create: (data: PurchaseCreateInput) => api.post<PurchaseDetailResponse>('/api/purchases', data),
  update: (id: number, data: PurchaseUpdateInput) => api.put<PurchaseDetailResponse>(`/api/purchases/${id}`, data),
  remove: (id: number) => api.delete(`/api/purchases/${id}`),
};

// ─── Estimates ────────────────────────────────────────────────────────────────

export const estimatesApi = {
  list: (params?: { search?: string; status?: string; customerId?: number; projectId?: number; page?: number; limit?: number }) =>
    api.get<EstimateListResponse>('/api/estimates', { params }),
  detail: (id: number) => api.get<EstimateDetailResponse>(`/api/estimates/${id}`),
};

// ─── Stock ────────────────────────────────────────────────────────────────────

export const stockApi = {
  list: (params?: { inventoryId?: number; transactionType?: string; referenceId?: number; referenceType?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get<StockListResponse>('/api/stock', { params }),
  create: (data: StockPayload) => api.post<{ movement: StockMovement; newCurrentStock: number }>('/api/stock', data),
  update: (id: number, data: Partial<Omit<StockPayload, 'inventoryId'>>) =>
    api.put<{ movement: StockMovement; newCurrentStock: number }>(`/api/stock/${id}`, data),
  remove: (id: number) => api.delete<{ message: string; newCurrentStock: number }>(`/api/stock/${id}`),
};

// ─── GST ──────────────────────────────────────────────────────────────────────

export const gstApi = {
  list: (params?: { transactionType?: string; isFiled?: boolean; customerId?: number; vendorId?: number; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get<GstListResponse>('/api/gst', { params }),
  detail: (id: number) => api.get<GstDetailResponse>(`/api/gst/${id}`),
};

// ─── HR ───────────────────────────────────────────────────────────────────────

export const hrApi = {
  attendance: {
    list: (params?: { employeeId?: number; projectId?: number; from?: string; to?: string; page?: number; limit?: number }) =>
      api.get<AttendanceListResponse>('/api/hr/attendance', { params }),
    detail: (id: number) => api.get<AttendanceDetailResponse>(`/api/hr/attendance/${id}`),
    day: (date: string) => api.get<AttendanceDayResponse>('/api/hr/attendance/day', { params: { date } }),
    bulkMark: (payload: AttendanceBulkPayload) =>
      api.post<{ date: string; records: AttendanceRecord[] }>('/api/hr/attendance/bulk', payload),
    update: (id: number, data: AttendanceUpdatePayload) =>
      api.put<AttendanceDetailResponse>(`/api/hr/attendance/${id}`, data),
    remove: (id: number) => api.delete<{ success: boolean }>(`/api/hr/attendance/${id}`),
    monthSummary: (month: string) =>
      api.get<AttendanceMonthSummaryResponse>('/api/hr/attendance/summary/month', { params: { month } }),
    yearSummary: (employeeId: number, year: number) =>
      api.get<AttendanceYearSummaryResponse>('/api/hr/attendance/summary/year', { params: { employeeId, year } }),
  },
  salaryComponents: {
    list: (params?: { employeeId?: number; active?: boolean; page?: number; limit?: number }) =>
      api.get<SalaryComponentListResponse>('/api/hr/salary-components', { params }),
    create: (data: SalaryComponentPayload) =>
      api.post<{ component: SalaryComponent }>('/api/hr/salary-components', data),
    update: (id: number, data: Partial<SalaryComponentPayload>) =>
      api.put<{ component: SalaryComponent }>(`/api/hr/salary-components/${id}`, data),
    remove: (id: number) => api.delete<{ success: boolean }>(`/api/hr/salary-components/${id}`),
    payroll: (month: string) =>
      api.get<PayrollResponse>('/api/hr/salary-components/payroll', { params: { month } }),
  },
  salaryPayments: {
    list: (params?: { employeeId?: number; from?: string; to?: string; page?: number; limit?: number }) =>
      api.get<SalaryPaymentListResponse>('/api/hr/salary-payments', { params }),
    detail: (id: number) => api.get<SalaryPaymentDetailResponse>(`/api/hr/salary-payments/${id}`),
    create: (data: SalaryPaymentPayload) =>
      api.post<{ payment: SalaryPayment }>('/api/hr/salary-payments', data),
  },
  incentives: {
    list: (params?: { employeeId?: number; projectId?: number; incentiveType?: string; page?: number; limit?: number }) =>
      api.get<SalaryIncentiveListResponse>('/api/hr/incentives', { params }),
  },
  epfEsic: {
    list: (params?: { employeeId?: number; isPaid?: boolean; page?: number; limit?: number }) =>
      api.get<EpfEsicListResponse>('/api/hr/epf-esic', { params }),
    detail: (id: number) => api.get<EpfEsicDetailResponse>(`/api/hr/epf-esic/${id}`),
  },
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list: (params?: { search?: string; vehicleType?: string; active?: boolean; limit?: number }) =>
    api.get<VehicleListResponse>('/api/vehicles', { params }),
  detail: (id: number) => api.get<VehicleDetailResponse>(`/api/vehicles/${id}`),
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const maintenanceApi = {
  list: (params?: { status?: string; projectId?: number; limit?: number }) =>
    api.get<MaintenanceListResponse>('/api/maintenance', { params }),
  fdAlerts: (params?: { alertType?: string; isSent?: boolean; limit?: number }) =>
    api.get<FdAlertListResponse>('/api/maintenance/fd-alerts', { params }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaFile {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: string | null;
  fileType: string;
  uploadedAt: string;
  isPrimary?: boolean;
}

export interface AuthUser {
  id: number; username: string; email: string;
  firstName: string; lastName: string; isStaff: boolean; isSuperuser: boolean;
  // RBAC fields — absent when talking to a pre-RBAC backend (treat as full access)
  groups?: { id: number; name: string }[];
  permissions?: string[];
}
export interface LoginResponse { token: string; user: AuthUser; }
export interface MeResponse { user: AuthUser; }

export interface FeatureDef { key: string; label: string; hub: string; parent?: string; }
export interface AdminUser {
  id: number; username: string; email: string;
  firstName: string; lastName: string;
  isActive: boolean; isStaff: boolean; isSuperuser: boolean;
  lastLogin: string | null; dateJoined: string;
  groups: { id: number; name: string }[];
}
export interface AdminUserPayload {
  username?: string; password?: string; email?: string;
  firstName?: string; lastName?: string; isActive?: boolean;
  groupIds?: number[];
}
export interface AdminGroup {
  id: number; name: string; description: string; isActive: boolean;
  createdAt: string; updatedAt: string;
  features: string[]; memberCount: number;
}
export interface AdminGroupPayload {
  name?: string; description?: string; isActive?: boolean; features?: string[];
}

export interface KpiItem { total: number; label: string; phase: number; active?: number; }
export interface DashboardResponse {
  kpis: {
    users: number;
    customers: KpiItem; tenders: KpiItem; projects: KpiItem;
    vendors: KpiItem; employees: KpiItem; inventory: KpiItem;
    orders: KpiItem; invoices: KpiItem; purchases: KpiItem;
    attendance: KpiItem; salaryPayments: KpiItem; incentives: KpiItem;
    estimates: KpiItem; gstRecords: KpiItem;
    stockMovements: KpiItem; orderPayments: KpiItem;
    vehicles: KpiItem; maintenancePeriods: KpiItem;
  };
  migratedPhase: number;
}

export interface Customer {
  id: number; customerCode: string; customerName: string; businessName: string;
  email: string; phone: string; address: string; gstin: string;
  isActive: boolean; createdAt: string; updatedAt?: string;
}
export interface CustomerListResponse { customers: Customer[]; total: number; page: number; limit: number; }
export interface CustomerDetailResponse { customer: Customer; }
export interface CustomerPayload {
  customerCode?: string;
  customerName: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  isActive?: boolean;
}


export interface TenderSummary {
  id: number; tenderNo: string; title: string; status: string;
  tenderDate: string; closingDate: string; tenderAmount: string | null;
  workOrderNo: string | null; biddingPercentage: string; createdAt: string;
  _count: { projects: number };
}
export interface Tender extends TenderSummary {
  description: string; maintenancePeriod: number | null; tenderRemark: string | null;
  updatedAt: string;
  projects: { id: number; projectNo: string; name: string; status: string; budget: string }[];
  mediaFiles: MediaFile[];
}
export interface TenderListResponse { tenders: TenderSummary[]; total: number; page: number; limit: number; }
export interface TenderDetailResponse { tender: Tender; }

export interface ProjectSummary {
  id: number; projectNo: string; name: string; status: string;
  budget: string; startDate: string | null; endDate: string | null; createdAt: string;
  tender: { id: number; tenderNo: string; title: string } | null;
}
export interface Project extends ProjectSummary {
  description: string; updatedAt: string;
  tender: { id: number; tenderNo: string; title: string; status: string; tenderAmount: string | null } | null;
}
export interface ProjectListResponse { projects: ProjectSummary[]; total: number; page: number; limit: number; }
export interface ProjectDetailResponse { project: Project; }

export interface VendorSummary {
  id: number; vendorCode: string; name: string; contactPerson: string;
  phone: string; email: string; gstin: string; isActive: boolean; createdAt: string;
}
export interface Vendor extends VendorSummary {
  address: string; pan: string; bankName: string; accountNumber: string;
  ifscCode: string; updatedAt: string;
}
export interface VendorListResponse { vendors: VendorSummary[]; total: number; page: number; limit: number; }
export interface VendorDetailResponse { vendor: Vendor; }
export interface VendorPayload {
  vendorCode?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  isActive?: boolean;
}

export interface EmployeeSummary {
  id: number; employeeCode: string; name: string; phone: string; email: string;
  skillType: string; dailyWage: string; ctc: string; basicSalary: string;
  isActive: boolean; createdAt: string;
}
export interface Employee extends EmployeeSummary {
  address: string; aadharNo: string; pan: string; updatedAt: string;
}
export interface EmployeeListResponse { employees: EmployeeSummary[]; total: number; page: number; limit: number; }
export interface EmployeeDetailResponse { employee: Employee; }


export interface InventoryItem {
  id: number; itemCode: string; name: string; category: string;
  unit: string; unitPrice: string; reorderLevel: string;
  isActive: boolean; currentStock: number;
  primaryImage: { id: number; fileType: string } | null;
}
export interface StockMovement {
  id: number; quantity: string; transactionType: string;
  reference: string; notes: string; location: string; batchNo: string;
  referenceType: string | null; referenceId: number | null;
  createdAt: string;
  inventory?: { id: number; itemCode: string; name: string; unit: string };
}
export interface StockSummary { in: number; out: number; adjustment: number; }
export interface StockListResponse { movements: StockMovement[]; total: number; page: number; limit: number; summary: StockSummary; }
export interface InventoryDetail extends InventoryItem {
  description: string; updatedAt: string;
  recentStocks: StockMovement[];
  mediaFiles: MediaFile[];
}
export interface InventoryListResponse { inventory: InventoryItem[]; total: number; page: number; limit: number; }
export interface InventoryDetailResponse { item: InventoryDetail; }
export interface InventoryPayload {
  itemCode?: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unitPrice: number | string;
  reorderLevel?: number | string;
  isActive?: boolean;
  // Create-only: seeds an initial stock movement
  initialStock?: number | string;
  initialLocation?: string;
  initialReference?: string;
}
export interface StockPayload {
  inventoryId: number;
  quantity: number | string;
  transactionType: 'in' | 'out' | 'adjustment';
  location?: string;
  batchNo?: string;
  reference?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: number;
}


export interface OrderSummary {
  id: number; orderNo: string; status: string; paymentStatus: string;
  orderDate: string; deliveryDate: string | null;
  totalAmount: string; paidAmount: string;
  taxAmount: string | null; isGst: boolean;
  customer: { id: number; customerName: string } | null;
  project: { id: number; projectNo: string; name: string } | null;
}
export interface OrderItem {
  id: number; description: string | null; quantity: string; unitPrice: string;
  totalPrice: string; isRental: boolean; rentalDays: number;
  inventory: { id: number; itemCode: string; name: string; unit: string } | null;
}
export interface OrderPayment {
  id: number; amount: string; paymentMode: string; paymentDate: string; referenceNo: string | null;
}
export interface OrderDetail extends OrderSummary {
  notes: string | null; createdAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
  mediaFiles: MediaFile[];
}
export interface OrderListResponse { orders: OrderSummary[]; total: number; }
export interface OrderDetailResponse { order: OrderDetail; }

export interface InvoiceSummary {
  id: number; invoiceNo: string; status: string; invoiceType: string;
  invoiceDate: string; dueDate: string; gstDate: string | null;
  subtotal: string; taxAmount: string; totalAmount: string;
  customer: { id: number; customerName: string; phone: string; email: string } | null;
  vendor: { id: number; name: string; phone: string; email: string; gstin: string } | null;
  project: { id: number; projectNo: string; name: string } | null;
}
export interface InvoiceItem {
  id: number; description: string | null; quantity: string; unitPrice: string;
  taxRate: string; total: string;
}
export interface InvoiceDetail extends InvoiceSummary {
  notes: string | null; createdAt: string;
  items: InvoiceItem[];
  mediaFiles: MediaFile[];
}
export interface InvoiceListResponse { invoices: InvoiceSummary[]; total: number; }
export interface InvoiceDetailResponse { invoice: InvoiceDetail; }

export interface PurchaseSummary {
  id: number; purchaseNo: string; status: string; paymentStatus: string;
  purchaseDate: string; deliveryDate: string | null;
  totalAmount: string; paidAmount: string; taxAmount: string | null; subtotal: string; isGst: boolean;
  vendor: { id: number; vendorCode: string; name: string } | null;
}
export interface PurchaseItem {
  id: number; description: string; unit: string;
  quantity: string; unitPrice: string; taxRate: string; total: string;
  stockedQty: string;
  inventory: { id: number; itemCode: string; name: string; unit: string } | null;
}
export interface PurchaseDetail extends PurchaseSummary {
  notes: string | null; createdAt: string;
  items: PurchaseItem[];
  vendor: { id: number; vendorCode: string; name: string; phone: string; email: string; gstin: string } | null;
}
export interface PurchaseListResponse { purchases: PurchaseSummary[]; total: number; }
export interface PurchaseDetailResponse { purchase: PurchaseDetail; }

export interface PurchaseItemInput {
  id?: number;          // present for existing items; absent for new ones
  inventoryId?: number;
  description?: string;
  unit?: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}
export interface PurchaseCreateInput {
  vendorId?: number;
  purchaseDate: string;
  deliveryDate?: string;
  isGst: boolean;
  status: string;
  notes: string;
  paidAmount: string;
  items: PurchaseItemInput[];
}
export type PurchaseUpdateInput = PurchaseCreateInput;

// ─── HR Types ─────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: number; date: string; hoursWorked: string; overtimeHours: string;
  isPresent: boolean; attendanceStatus: string; notes: string; createdAt: string;
  employee: { id: number; name: string; employeeCode: string };
  project: { id: number; name: string; projectNo: string } | null;
}
export interface AttendanceListResponse { records: AttendanceRecord[]; total: number; page: number; limit: number; }
export interface AttendanceDetailResponse { record: AttendanceRecord; }

// Day roster record — raw row without the employee/project joins
export interface AttendanceDayRecord {
  id: number; date: string; hoursWorked: string; overtimeHours: string;
  isPresent: boolean; attendanceStatus: string; notes: string; createdAt: string;
}
export interface AttendanceDayEmployee {
  id: number; name: string; employeeCode: string; skillType: string;
  record: AttendanceDayRecord | null;
}
export interface AttendanceDayResponse { date: string; employees: AttendanceDayEmployee[]; }
export interface AttendanceBulkPayload {
  date: string; // YYYY-MM-DD
  records: {
    employeeId: number;
    attendanceStatus: string; // P | A | H | L
    hoursWorked?: number;
    overtimeHours?: number;
    notes?: string;
  }[];
}
export interface AttendanceUpdatePayload {
  attendanceStatus?: string; hoursWorked?: number; overtimeHours?: number; notes?: string;
}
export interface AttendanceStatusCounts { P: number; A: number; H: number; L: number; }
export interface AttendanceMonthSummaryRow {
  employee: { id: number; name: string; employeeCode: string; skillType: string };
  counts: AttendanceStatusCounts;
  totalHours: number; totalOvertime: number; markedDays: number;
}
export interface AttendanceMonthSummaryResponse { month: string; rows: AttendanceMonthSummaryRow[]; }
export interface AttendanceYearMonthBucket {
  month: number; counts: AttendanceStatusCounts; totalHours: number; totalOvertime: number;
}
export interface AttendanceYearSummaryResponse {
  year: number;
  employee: { id: number; name: string; employeeCode: string; skillType: string };
  months: AttendanceYearMonthBucket[];
}

export interface SalaryComponent {
  id: number; componentType: string; name: string; amount: string;
  isActive: boolean; effectiveFrom: string; effectiveTo: string | null; notes: string;
  createdAt: string; updatedAt: string;
  employee: { id: number; name: string; employeeCode: string };
}
export interface SalaryComponentListResponse { components: SalaryComponent[]; total: number; page: number; limit: number; }
export interface SalaryComponentPayload {
  employeeId?: number;
  componentType?: string;   // 'allowance' | 'deduction'
  name?: string;
  amount?: number;
  isActive?: boolean;
  effectiveFrom?: string;   // YYYY-MM-DD
  effectiveTo?: string | null;
  notes?: string;
}

// Payroll — computed monthly salary per employee (attendance-driven)
export interface PayrollRow {
  employee: { id: number; name: string; employeeCode: string; dailyWage: string };
  counts: AttendanceStatusCounts;
  otHours: number;
  payableDays: number;
  earned: number;
  allowances: number;
  deductions: number;
  components: { id: number; name: string; componentType: string; amount: string }[];
  net: number;
  payment: {
    id: number; employeeId: number; amount: string;
    paymentDate: string; paymentMethod: string; referenceNumber: string;
  } | null;
}
export interface PayrollResponse { month: string; rows: PayrollRow[]; }
export interface SalaryPaymentPayload {
  employeeId: number;
  paymentMonth: string;   // YYYY-MM-01
  paymentDate: string;    // YYYY-MM-DD
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface SalaryPayment {
  id: number; paymentMonth: string; paymentDate: string; amount: string;
  paymentMethod: string; referenceNumber: string; notes: string;
  createdAt: string; updatedAt: string;
  employee: { id: number; name: string; employeeCode: string };
}
export interface SalaryPaymentListResponse { payments: SalaryPayment[]; total: number; page: number; limit: number; }
export interface SalaryPaymentDetailResponse { payment: SalaryPayment; }

export interface SalaryIncentive {
  id: number; incentiveType: string; amount: string; paymentDate: string;
  description: string; paymentMethod: string; referenceNumber: string;
  createdAt: string; updatedAt: string;
  employee: { id: number; name: string; employeeCode: string };
  project: { id: number; name: string; projectNo: string } | null;
}
export interface SalaryIncentiveListResponse { incentives: SalaryIncentive[]; total: number; page: number; limit: number; }

export interface EpfEsicRecord {
  id: number; month: string; basicWage: string; grossWages: string; workingDays: number;
  epfEmployee: string; epfEmployer: string; esicEmployee: string; esicEmployer: string;
  epfAdminCharges: string; totalDeduction: string; isPaid: boolean; paidDate: string | null; notes: string;
  createdAt: string; updatedAt: string;
  employee: { id: number; name: string; employeeCode: string } | null;
}
export interface EpfEsicListResponse { records: EpfEsicRecord[]; total: number; page: number; limit: number; }
export interface EpfEsicDetailResponse { record: EpfEsicRecord; }

// ─── Estimate Types ───────────────────────────────────────────────────────────

export interface EstimateSummary {
  id: number; estimateNo: string; status: string;
  estimateDate: string; validUntil: string; totalAmount: string;
  customer: { id: number; customerName: string; phone: string } | null;
  project:  { id: number; projectNo: string; name: string } | null;
  _count: { items: number };
}
export interface EstimateItemType {
  id: number; description: string; quantity: string; unitPrice: string; total: string;
}
export interface EstimateDetail extends EstimateSummary {
  notes: string; createdAt: string; updatedAt: string;
  items: EstimateItemType[];
  customer: { id: number; customerName: string; businessName: string; phone: string; email: string; address: string } | null;
  project:  { id: number; projectNo: string; name: string; status: string } | null;
}
export interface EstimateListResponse { estimates: EstimateSummary[]; total: number; page: number; limit: number; }
export interface EstimateDetailResponse { estimate: EstimateDetail; }

// ─── GST Types ────────────────────────────────────────────────────────────────

export interface GstRecord {
  id: number; gstNo: string; transactionType: string; invoiceNo: string;
  transactionDate: string; taxableAmount: string;
  cgst: string; sgst: string; igst: string; totalGst: string; totalAmount: string;
  gstRate: string; isFiled: boolean; filingDate: string | null; notes: string;
  createdAt: string; updatedAt: string;
  customer: { id: number; customerName: string } | null;
  vendor:   { id: number; name: string } | null;
}
export interface GstSummary {
  taxableAmount: string | null; cgst: string | null; sgst: string | null;
  igst: string | null; totalGst: string | null; totalAmount: string | null;
}
export interface GstListResponse { records: GstRecord[]; total: number; page: number; limit: number; summary: GstSummary; }
export interface GstDetailResponse { record: GstRecord; }

// ─── Vehicle Types ────────────────────────────────────────────────────────────

export interface VehicleSummary {
  id: number; vehicleNo: string; vehicleType: string; make: string; vehicleModel: string;
  year: number | null; driverName: string; driverPhone: string; isActive: boolean;
  insuranceExpiry: string | null; permitExpiry: string | null; fitnessExpiry: string | null;
  createdAt: string;
  _count: { usages: number };
}
export interface VehicleUsageEntry {
  id: number; date: string; startKm: number | null; endKm: number | null;
  distanceKm: string | null; fuelCost: string; driverName: string; purpose: string; notes: string;
  createdAt: string;
  project: { id: number; projectNo: string; name: string } | null;
}
export interface VehicleDetail extends VehicleSummary {
  registrationDate: string | null; notes: string; updatedAt: string;
  usages: VehicleUsageEntry[];
}
export interface VehicleListResponse { vehicles: VehicleSummary[]; total: number; }
export interface VehicleDetailResponse { vehicle: VehicleDetail; }

// ─── Maintenance Types ────────────────────────────────────────────────────────

export interface FdAlert {
  id: number; alertDate: string; alertType: string; isSent: boolean;
  sentAt: string | null; notes: string; createdAt: string;
}
export interface MaintenancePeriod {
  id: number; startDate: string; endDate: string; durationMonths: number;
  status: string; createdAt: string;
  project: { id: number; projectNo: string; name: string };
  fdAlerts: FdAlert[];
}
export interface FdAlertWithPeriod extends FdAlert {
  maintenancePeriod: {
    id: number; startDate: string; endDate: string; status: string;
    project: { id: number; projectNo: string; name: string };
  };
}
export interface MaintenanceListResponse { periods: MaintenancePeriod[]; total: number; }
export interface FdAlertListResponse { alerts: FdAlertWithPeriod[]; total: number; }
