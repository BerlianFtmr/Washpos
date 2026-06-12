import { api } from '@/lib/api';
import type {
  Payment,
  PaymentQueryParams,
  CreatePaymentPayload,
  UpdatePaymentPayload,
  PaginatedData,
} from '@/types';

export const paymentService = {
  list(params?: PaymentQueryParams) {
    return api.getPaginated<Payment>('/payments', params as Record<string, string | number | undefined>);
  },

  getById(id: number) {
    return api.get<Payment>(`/payments/${id}`);
  },

  create(payload: CreatePaymentPayload) {
    return api.post<Payment>('/payments', payload);
  },

  update(id: number, payload: UpdatePaymentPayload) {
    return api.patch<Payment>(`/payments/${id}`, payload);
  },

  delete(id: number) {
    return api.delete<void>(`/payments/${id}`);
  },
};
