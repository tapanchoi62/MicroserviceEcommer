const BASE_URL  = process.env.NEXT_PUBLIC_AUTH_API_URL  || 'http://localhost:3001/api/v1/auth';
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE || 'http://localhost:3001/api/v1';
const PRODUCT_BASE = process.env.NEXT_PUBLIC_PRODUCT_API_BASE || 'http://localhost:3002/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const tokenStorage = {
  getAccess: () =>
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  getRefresh: () =>
    typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
  set: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  },
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    tokenStorage.clear();
    return null;
  }

  const data = await res.json();
  tokenStorage.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  baseUrl = BASE_URL,
): Promise<T> {
  const accessToken = tokenStorage.getAccess();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;
      pendingQueue.forEach((cb) => newToken && cb(newToken));
      pendingQueue = [];

      if (!newToken) throw new ApiError(401, 'Session expired. Please log in again.');
      return apiFetch<T>(path, options, false, baseUrl);
    } else {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          apiFetch<T>(path, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } }, false, baseUrl)
            .then(resolve)
            .catch(reject);
        });
      });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error.message || 'Something went wrong');
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Typed error ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth API calls ───────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  roles: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  status: string;
  createdAt: string;
  userRoles: Array<{ role: { name: string } }>;
}

export interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivity: string;
  createdAt: string;
}

// ─── Admin API types ─────────────────────────────────────────────────────────
export interface MemberRole {
  role: { id: string; name: string; description: string | null };
}

export interface Member {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  provider: string;
  createdAt: string;
  userRoles: MemberRole[];
}

export interface MembersResponse {
  users: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MembersParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface UpdateRolesResponse {
  message: string;
  assignedRoles: string[];
}

// ─── Admin API (users + roles management) ────────────────────────────────────
function adminFetch<T>(path: string, options?: RequestInit) {
  return apiFetch<T>(path, options ?? {}, true, ADMIN_BASE);
}

export const adminApi = {
  /** List members visible to the caller (ADMIN sees STAFF/CUSTOMER; SUPER_ADMIN sees all). */
  getMembers: (params: MembersParams = {}): Promise<MembersResponse> => {
    const qs = new URLSearchParams();
    if (params.page)   qs.set('page',  String(params.page));
    if (params.limit)  qs.set('limit', String(params.limit));
    if (params.role)   qs.set('role',  params.role);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return adminFetch<MembersResponse>(`/users/members${query}`);
  },

  /** Hierarchy-aware role replace (ADMIN: STAFF/CUSTOMER only; SUPER_ADMIN: unrestricted). */
  updateMemberRoles: (userId: string, roles: string[]): Promise<UpdateRolesResponse> =>
    adminFetch<UpdateRolesResponse>(`/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    }),
};

// ─── Auth API calls ───────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    apiFetch<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<void>('/logout', { method: 'POST' }),

  getProfile: () =>
    apiFetch<UserProfile>('/profile'),

  getSessions: () =>
    apiFetch<Session[]>('/sessions'),

  revokeSession: (sessionId: string) =>
    apiFetch<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),
};

// ─── Product API types ────────────────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  price: string;
  comparePrice: string | null;
  weight: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  variantAttributes: Array<{
    id: string;
    variantId: string;
    attributeName: string;
    attributeValue: string;
  }>;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
  isThumbnail: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandId: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  brand: Brand | null;
  productCategories: Array<{
    productId: string;
    categoryId: string;
    category: Category;
  }>;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  brandId?: string;
  categoryId?: string;
  status?: string;
}

// ─── Product API calls ────────────────────────────────────────────────────────
function productFetch<T>(path: string, options?: RequestInit) {
  return apiFetch<T>(path, options ?? {}, true, PRODUCT_BASE);
}

export const productApi = {
  getProducts: (params: ProductsParams = {}): Promise<ProductsResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.keyword) qs.set('keyword', params.keyword);
    if (params.brandId) qs.set('brandId', params.brandId);
    if (params.categoryId) qs.set('categoryId', params.categoryId);
    if (params.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return productFetch<ProductsResponse>(`/products${query}`);
  },

  getProductById: (id: string): Promise<Product> =>
    productFetch<Product>(`/products/${id}`),

  getBrands: (): Promise<Brand[]> =>
    productFetch<Brand[]>('/brands'),

  getCategories: (): Promise<Category[]> =>
    productFetch<Category[]>('/categories'),

  searchProducts: (query: string, page = 1, pageSize = 20): Promise<ProductsResponse> =>
    productFetch<ProductsResponse>(`/search/products?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`),
};
