import { getToken } from './auth';
import type { ApiResponse, PaginatedData } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

class ApiError extends Error {
  status: number;
  data: ApiResponse<unknown>;

  constructor(status: number, data: ApiResponse<unknown>) {
    super(data.message || 'API Error');
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await res.json();

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      const { removeToken } = await import('./auth');
      removeToken();
      window.location.href = '/login';
    }

    throw new ApiError(res.status, body);
  }

  return body.data as T;
}

export const api = {
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    return request<T>(url);
  },

  /**
   * GET request that normalizes list API responses into PaginatedData.
   * The backend returns `body.data` as a plain array (no pagination wrapper).
   * This method wraps it into { data: T[], pagination: { ... } }.
   */
  getPaginated<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    const page = (params?.page as number) ?? 1;
    const limit = (params?.limit as number) ?? 10;
    return this.get<T[]>(endpoint, params).then((data) => {
      const arr = Array.isArray(data) ? data : [];
      return {
        data: arr,
        pagination: {
          page,
          limit,
          total: arr.length,
          totalPages: Math.max(1, Math.ceil(arr.length / limit)),
        },
      } satisfies PaginatedData<T>;
    });
  },

  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export { ApiError };
export default api;
