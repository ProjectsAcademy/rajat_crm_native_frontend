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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSummary: () => api.get<DashboardResponse>('/api/dashboard'),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<CustomerListResponse>('/api/customers', { params }),
  detail: (id: number) => api.get<CustomerDetailResponse>(`/api/customers/${id}`),
};

// ─── Tenders ──────────────────────────────────────────────────────────────────

export const tendersApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<TenderListResponse>('/api/tenders', { params }),
  detail: (id: number) => api.get<TenderDetailResponse>(`/api/tenders/${id}`),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<InventoryListResponse>('/api/inventory', { params }),
  detail: (id: number) => api.get<InventoryDetailResponse>(`/api/inventory/${id}`),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendorsApi = {
  list: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<VendorListResponse>('/api/vendors', { params }),
  detail: (id: number) => api.get<VendorDetailResponse>(`/api/vendors/${id}`),
};

// ─── Employees ────────────────────────────────────────────────────────────────

export const employeesApi = {
  list: (params?: { search?: string; skillType?: string; active?: boolean; page?: number; limit?: number }) =>
    api.get<EmployeeListResponse>('/api/employees', { params }),
  detail: (id: number) => api.get<EmployeeDetailResponse>(`/api/employees/${id}`),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ProjectListResponse>('/api/projects', { params }),
  detail: (id: number) => api.get<ProjectDetailResponse>(`/api/projects/${id}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: { search?: string; status?: string; paymentStatus?: string; limit?: number }) =>
    api.get<OrderListResponse>('/api/orders', { params }),
  detail: (id: number) => api.get<OrderDetailResponse>(`/api/orders/${id}`),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (params?: { search?: string; status?: string; invoiceType?: string; limit?: number }) =>
    api.get<InvoiceListResponse>('/api/invoices', { params }),
  detail: (id: number) => api.get<InvoiceDetailResponse>(`/api/invoices/${id}`),
};

// ─── Purchases ────────────────────────────────────────────────────────────────

export const purchasesApi = {
  list: (params?: { search?: string; status?: string; paymentStatus?: string; limit?: number }) =>
    api.get<PurchaseListResponse>('/api/purchases', { params }),
  detail: (id: number) => api.get<PurchaseDetailResponse>(`/api/purchases/${id}`),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number; username: string; email: string;
  firstName: string; lastName: string; isStaff: boolean; isSuperuser: boolean;
}
export interface LoginResponse { token: string; user: AuthUser; }
export interface MeResponse { user: AuthUser; }

export interface KpiItem { total: number; label: string; phase: number; active?: number; }
export interface DashboardResponse {
  kpis: {
    users: number;
    customers: KpiItem; tenders: KpiItem; projects: KpiItem;
    vendors: KpiItem; employees: KpiItem; inventory: KpiItem;
    orders: KpiItem; invoices: KpiItem; purchases: KpiItem;
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

export interface EmployeeSummary {
  id: number; employeeCode: string; name: string; phone: string; email: string;
  skillType: string; dailyWage: string; ctc: string; isActive: boolean; createdAt: string;
}
export interface Employee extends EmployeeSummary {
  address: string; aadharNo: string; pan: string; basicSalary: string; updatedAt: string;
}
export interface EmployeeListResponse { employees: EmployeeSummary[]; total: number; page: number; limit: number; }
export interface EmployeeDetailResponse { employee: Employee; }

export interface InventoryItem {
  id: number; itemCode: string; name: string; category: string;
  unit: string; unitPrice: string; reorderLevel: string;
  isActive: boolean; currentStock: number;
}
export interface StockMovement {
  id: number; quantity: string; transactionType: string;
  reference: string; notes: string; location: string; createdAt: string;
}
export interface InventoryDetail extends InventoryItem {
  description: string; updatedAt: string;
  recentStocks: StockMovement[];
}
export interface InventoryListResponse { inventory: InventoryItem[]; total: number; page: number; limit: number; }
export interface InventoryDetailResponse { item: InventoryDetail; }

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
  totalPrice: string; isRental: boolean;
  inventory: { id: number; itemCode: string; name: string; unit: string } | null;
}
export interface OrderPayment {
  id: number; amount: string; paymentMode: string; paymentDate: string; referenceNo: string | null;
}
export interface OrderDetail extends OrderSummary {
  notes: string | null; createdAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
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
}
export interface InvoiceListResponse { invoices: InvoiceSummary[]; total: number; }
export interface InvoiceDetailResponse { invoice: InvoiceDetail; }

export interface PurchaseSummary {
  id: number; purchaseNo: string; status: string; paymentStatus: string;
  purchaseDate: string; deliveryDate: string | null;
  totalAmount: string; paidAmount: string; taxAmount: string | null; isGst: boolean;
  vendor: { id: number; vendorCode: string; name: string } | null;
}
export interface PurchaseItem {
  id: number; quantity: string; unitPrice: string; taxRate: string; total: string;
  inventory: { id: number; itemCode: string; name: string; unit: string } | null;
}
export interface PurchaseDetail extends PurchaseSummary {
  notes: string | null; createdAt: string;
  items: PurchaseItem[];
  vendor: { id: number; vendorCode: string; name: string; phone: string; email: string; gstin: string } | null;
}
export interface PurchaseListResponse { purchases: PurchaseSummary[]; total: number; }
export interface PurchaseDetailResponse { purchase: PurchaseDetail; }
