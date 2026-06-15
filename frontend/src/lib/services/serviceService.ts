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

  getById(code: string) {
    return api.get<Service>(`/services/${code}`);
  },

  create(payload: CreateServicePayload) {
    return api.post<Service>('/services', payload);
  },

  update(code: string, payload: UpdateServicePayload) {
    return api.patch<Service>(`/services/${code}`, payload);
  },

  delete(code: string) {
    return api.delete<void>(`/services/${code}`);
  },
};
