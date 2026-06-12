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

  getById(id: number) {
    return api.get<User>(`/users/${id}`);
  },

  create(payload: CreateUserPayload) {
    return api.post<User>('/users', payload);
  },

  update(id: number, payload: UpdateUserPayload) {
    return api.patch<User>(`/users/${id}`, payload);
  },

  delete(id: number) {
    return api.delete<void>(`/users/${id}`);
  },
};
