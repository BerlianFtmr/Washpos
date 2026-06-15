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

  getById(code: string) {
    return api.get<Payment>(`/payments/${code}`);
  },

  create(payload: CreatePaymentPayload) {
    return api.post<Payment>('/payments', payload);
  },

  update(code: string, payload: UpdatePaymentPayload) {
    return api.patch<Payment>(`/payments/${code}`, payload);
  },

  delete(code: string) {
    return api.delete<void>(`/payments/${code}`);
  },
};
