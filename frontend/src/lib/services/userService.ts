import { api } from '@/lib/api';
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  PaginatedData,
} from '@/types';

export const userService = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return api.getPaginated<User>('/users', params as Record<string, string | number | undefined>);
  },

  getById(code: string) {
    return api.get<User>(`/users/${code}`);
  },

  create(payload: CreateUserPayload) {
    return api.post<User>('/users', payload);
  },

  update(code: string, payload: UpdateUserPayload) {
    return api.patch<User>(`/users/${code}`, payload);
  },

  delete(code: string) {
    return api.delete<void>(`/users/${code}`);
  },
};
