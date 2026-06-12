import { api } from '@/lib/api';
import { setToken, removeToken } from '@/lib/auth';
import type { AuthUser, LoginPayload, LoginResponse } from '@/types';

export const authService = {
  login(payload: LoginPayload) {
    return api.post<LoginResponse>('/auth/login', payload).then((data) => {
      setToken(data.token);
      return data;
    });
  },

  getMe() {
    return api.get<AuthUser>('/auth/me');
  },

  logout() {
    removeToken();
  },
};
