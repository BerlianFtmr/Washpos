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

  getById(id: number) {
    return api.get<Customer>(`/customers/${id}`);
  },

  create(payload: CreateCustomerPayload) {
    return api.post<Customer>('/customers', payload);
  },

  update(id: number, payload: UpdateCustomerPayload) {
    return api.patch<Customer>(`/customers/${id}`, payload);
  },

  delete(id: number) {
    return api.delete<void>(`/customers/${id}`);
  },
};
