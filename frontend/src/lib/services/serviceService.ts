import { api } from '@/lib/api';
import type {
  Service,
  ServiceQueryParams,
  CreateServicePayload,
  UpdateServicePayload,
  PaginatedData,
} from '@/types';

export const serviceService = {
  list(params?: ServiceQueryParams) {
    return api.getPaginated<Service>('/services', params as Record<string, string | number | boolean | undefined>);
  },

  getById(id: number) {
    return api.get<Service>(`/services/${id}`);
  },

  create(payload: CreateServicePayload) {
    return api.post<Service>('/services', payload);
  },

  update(id: number, payload: UpdateServicePayload) {
    return api.patch<Service>(`/services/${id}`, payload);
  },

  delete(id: number) {
    return api.delete<void>(`/services/${id}`);
  },
};
