import { api } from '@/lib/api';
import type {
  Customer,
  CustomerQueryParams,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  PaginatedData,
} from '@/types';

export const customerService = {
  list(params?: CustomerQueryParams) {
    return api.getPaginated<Customer>('/customers', params as Record<string, string | number | undefined>);
  },

  getById(code: string) {
    return api.get<Customer>(`/customers/${code}`);
  },

  create(payload: CreateCustomerPayload) {
    return api.post<Customer>('/customers', payload);
  },

  update(code: string, payload: UpdateCustomerPayload) {
    return api.patch<Customer>(`/customers/${code}`, payload);
  },

  delete(code: string) {
    return api.delete<void>(`/customers/${code}`);
  },
};
