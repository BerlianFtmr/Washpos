// ─── Enums / Union Types ───────────────────────────────────────────

export type UserRole = 'admin' | 'pegawai';

export type OrderStatus =
  | 'pending'
  | 'dicuci'
  | 'disetrika'
  | 'siap'
  | 'diambil'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type PaymentMethod = 'cash' | 'transfer' | 'ewallet';

export type ServiceUnit = 'kg' | 'piece' | 'meter' | 'pair';

// ─── Entities ──────────────────────────────────────────────────────

export interface User {
  id: number;
  code: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  whatsapp: string;
  address: string | null;
  created_at: string;
  order_count?: number;
}

export interface Service {
  id: number;
  code: string;
  name: string;
  price: number;
  unit: ServiceUnit;
  active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  service_id: number;
  quantity: number;
  subtotal: number;
  service?: Service;
}

export interface Order {
  id: number;
  code: string;
  customer_id: number;
  user_id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  user?: User;
  items?: OrderItem[];
  payments?: Payment[];
  audit_logs?: AuditLog[];
}

export interface Payment {
  id: number;
  code: string;
  order_id: number;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  created_at: string;
  order?: Order;
  customer?: Customer;
}

export interface AuditLog {
  id: number;
  order_id: number;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: number;
  changed_at: string;
  user?: User;
}

// ─── Auth ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  code: string;
  username: string;
  role: UserRole;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── API Responses ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Dashboard ─────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrdersToday: number;
  totalRevenueToday: number;
  activeOrders: number;
  readyForPickup: number;
  statusDistribution: Array<{ status: OrderStatus; count: number }>;
  recentOrders: Order[];
}

// ─── Income Recap (SCR-15) ────────────────────────────────────────

export type RecapPeriod = 'week' | 'month' | 'year';

export type RecapGranularity = 'day' | 'month';

export interface RecapRange {
  startDate: string;
  endDate: string;
}

/** Metrik dengan perbandingan periode sebelumnya. growthPct null saat previous = 0. */
export interface RecapMetric {
  current: number;
  previous: number;
  growthPct: number | null;
}

export interface RecapSummary {
  revenue: RecapMetric;
  orderValue: RecapMetric;
  transactions: RecapMetric;
  orders: RecapMetric;
  avgPerTransaction: number;
  avgPerOrder: number;
}

export interface RecapBreakdownRow {
  label: string;
  date: string;
  revenue: number;
  transactions: number;
  orderValue: number;
  orders: number;
}

export interface IncomeRecap {
  period: RecapPeriod;
  granularity: RecapGranularity;
  current: RecapRange;
  previous: RecapRange;
  summary: RecapSummary;
  breakdown: RecapBreakdownRow[];
}

// ─── Request Payloads ──────────────────────────────────────────────

export interface CreateOrderPayload {
  customer_code: string;
  items: Array<{ service_code: string; quantity: number }>;
  notes?: string;
}

export interface UpdateOrderPayload {
  customer_code?: string;
  notes?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

export interface AddPaymentPayload {
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface CreateCustomerPayload {
  name: string;
  whatsapp: string;
  address?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  whatsapp?: string;
  address?: string;
}

export interface CreateServicePayload {
  name: string;
  price: number;
  unit: ServiceUnit;
  active?: boolean;
}

export interface UpdateServicePayload {
  name?: string;
  price?: number;
  unit?: ServiceUnit;
  active?: boolean;
}

export interface CreatePaymentPayload {
  order_code: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface UpdatePaymentPayload {
  amount?: number;
  method?: PaymentMethod;
  note?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: UserRole;
}

// ─── Query Params ──────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface OrderQueryParams extends PaginationParams {
  status?: OrderStatus;
  customer_code?: string;
}

export interface CustomerQueryParams extends PaginationParams {
  search?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  order_code?: string;
}

export interface ServiceQueryParams extends PaginationParams {
  active?: boolean;
}
