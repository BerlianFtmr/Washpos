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

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/**
 * Low-level request returning the FULL response body (so callers can read
 * top-level fields like `pagination` alongside `data`).
 */
async function requestRaw<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T> & { pagination?: PaginationMeta }> {
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

  return body as ApiResponse<T> & { pagination?: PaginationMeta };
}

function withParams(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

export const api = {
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    return requestRaw<T>(withParams(endpoint, params)).then((body) => body.data as T);
  },

  /**
   * GET request that normalizes list API responses into PaginatedData.
   * The backend returns `body.data` as a plain array plus a top-level
   * `pagination` object ({ page, limit, total }). Falls back gracefully
   * if pagination meta is absent.
   */
  getPaginated<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    const fallbackLimit = (params?.limit as number) ?? 10;
    const fallbackPage = (params?.page as number) ?? 1;
    return requestRaw<T[]>(withParams(endpoint, params)).then((body) => {
      const arr = Array.isArray(body.data) ? body.data : [];
      const pg = body.pagination;
      const limit = pg?.limit ?? fallbackLimit;
      const total = pg?.total ?? arr.length;
      const page = pg?.page ?? fallbackPage;
      return {
        data: arr,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      } satisfies PaginatedData<T>;
    });
  },

  post<T>(endpoint: string, body?: unknown) {
    return requestRaw<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }).then((res) => res.data as T);
  },

  patch<T>(endpoint: string, body?: unknown) {
    return requestRaw<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }).then((res) => res.data as T);
  },

  delete<T>(endpoint: string) {
    return requestRaw<T>(endpoint, { method: 'DELETE' }).then((res) => res.data as T);
  },
};

export { ApiError };
export default api;
