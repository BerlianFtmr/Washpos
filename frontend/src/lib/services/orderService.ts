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

  getById(id: number) {
    return api.get<Order>(`/orders/${id}`);
  },

  create(payload: CreateOrderPayload) {
    return api.post<Order>('/orders', payload);
  },

  update(id: number, payload: UpdateOrderPayload) {
    return api.patch<Order>(`/orders/${id}`, payload);
  },

  updateStatus(id: number, payload: UpdateOrderStatusPayload) {
    return api.patch<Order>(`/orders/${id}/status`, payload);
  },

  addPayment(id: number, payload: AddPaymentPayload) {
    return api.post<Payment>(`/orders/${id}/payments`, payload);
  },

  delete(id: number) {
    return api.delete<void>(`/orders/${id}`);
  },
};
