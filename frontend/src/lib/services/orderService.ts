import { api } from '@/lib/api';
import type {
  Order,
  OrderQueryParams,
  CreateOrderPayload,
  UpdateOrderPayload,
  UpdateOrderStatusPayload,
  AddPaymentPayload,
  PaginatedData,
  Payment,
} from '@/types';

export const orderService = {
  list(params?: OrderQueryParams) {
    return api.getPaginated<Order>('/orders', params as Record<string, string | number | undefined>);
  },

  getById(code: string) {
    return api.get<Order>(`/orders/${code}`);
  },

  create(payload: CreateOrderPayload) {
    return api.post<Order>('/orders', payload);
  },

  update(code: string, payload: UpdateOrderPayload) {
    return api.patch<Order>(`/orders/${code}`, payload);
  },

  updateStatus(code: string, payload: UpdateOrderStatusPayload) {
    return api.patch<Order>(`/orders/${code}/status`, payload);
  },

  addPayment(code: string, payload: AddPaymentPayload) {
    return api.post<Payment>(`/orders/${code}/payments`, payload);
  },

  delete(code: string) {
    return api.delete<void>(`/orders/${code}`);
  },
};
