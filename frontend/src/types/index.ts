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
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  whatsapp: string;
  address: string | null;
  created_at: string;
  order_count?: number;
}

export interface Service {
  id: number;
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

// ─── Request Payloads ──────────────────────────────────────────────

export interface CreateOrderPayload {
  customer_id: number;
  items: Array<{ service_id: number; quantity: number }>;
  notes?: string;
}

export interface UpdateOrderPayload {
  customer_id?: number;
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
  order_id: number;
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
  customer_id?: number;
}

export interface CustomerQueryParams extends PaginationParams {
  search?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  order_id?: number;
}

export interface ServiceQueryParams extends PaginationParams {
  active?: boolean;
}
