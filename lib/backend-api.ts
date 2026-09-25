import { api } from './api';
import type {
  AuditResponse,
  GroupData,
  LoginResponse,
  Order,
  OrdersResponse,
  Part,
  PartsSearchResponse,
  ResolvePartResponse,
  Rooftop,
  Franchise,
  FeedHealth,
  RfqInboxResponse,
  TradeAccount,
  User,
  PartsCheckSummary,
} from './types';

export const backendApi = {
  auth: {
    login: (email: string, password: string) =>
      api<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      }),

    register: (input: {
      email: string;
      fullName: string;
      password: string;
      role?: string;
      tradeAccountId?: string;
      rooftopId?: string;
    }) =>
      api<{ message: string; userId: string }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          ...input,
          email: input.email.trim().toLowerCase(),
        }),
      }),

    me: () => api<User>('/auth/me'),

    logout: () => api<{ message: string }>('/auth/logout', { method: 'POST' }),

    refresh: (refreshToken: string) =>
      api<LoginResponse>('/auth/refresh', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ refreshToken }),
      }),

    enrollTotp: () =>
      api<{ factorId: string; qrCode: string; secret: string }>(
        '/auth/totp/enroll',
        { method: 'POST' }
      ),

    verifyTotp: (factorId: string, code: string) =>
      api<LoginResponse>('/auth/totp/verify', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ factorId, code }),
      }),
  },

  rooftops: {
    list: () => api<Rooftop[]>('/rooftops'),
    get: (id: string) => api<Rooftop>(`/rooftops/${encodeURIComponent(id)}`),
    franchises: (id: string) =>
      api<Franchise[]>(`/rooftops/${encodeURIComponent(id)}/franchises`),
    feedHealth: (id: string) =>
      api<FeedHealth[]>(`/rooftops/${encodeURIComponent(id)}/feed-health`),
    create: (body: unknown) =>
      api<Rooftop>('/rooftops', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      api<Rooftop>(`/rooftops/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },

  accounts: {
    mine: () => api<TradeAccount>('/accounts/my'),
    list: () => api<TradeAccount[]>('/accounts'),
    get: (id: string) => api<TradeAccount>(`/accounts/${encodeURIComponent(id)}`),
    spend: (id: string, year?: number) =>
      api<unknown>(
        `/accounts/${encodeURIComponent(id)}/spend${year ? `?year=${year}` : ''}`
      ),
    creditHold: (id: string, value: boolean) =>
      api<TradeAccount>(`/accounts/${encodeURIComponent(id)}/credit-hold`, {
        method: 'PATCH',
        body: JSON.stringify({ creditHold: value }),
      }),
    overdue: (id: string, value: boolean) =>
      api<TradeAccount>(`/accounts/${encodeURIComponent(id)}/overdue`, {
        method: 'PATCH',
        body: JSON.stringify({ isOverdue: value }),
      }),
  },

  parts: {
    search: (params: string) =>
      api<PartsSearchResponse>(`/parts/search?${params}`),
    get: (id: string) => api<Part>(`/parts/${encodeURIComponent(id)}`),
    resolve: (
      partNumber: string,
      rooftopId: string,
      accountId: string,
      brandCode?: string
    ) =>
      api<ResolvePartResponse>(
        `/parts/${encodeURIComponent(partNumber)}/resolve?rooftopId=${encodeURIComponent(
          rooftopId
        )}&accountId=${encodeURIComponent(accountId)}${
          brandCode ? `&brandCode=${encodeURIComponent(brandCode)}` : ''
        }`
      ),
  },

  orders: {
    create: (body: unknown) =>
      api<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
    list: (query = '') =>
      api<OrdersResponse>(`/orders${query ? `?${query}` : ''}`),
    queue: (query = '') =>
      api<{
        rooftopId?: string;
        summary?: {
          totalQueued?: number;
          pendingPicking?: number;
          exceptionsCount?: number;
        };
        orders: Order[];
      }>(`/orders/queue${query ? `?${query}` : ''}`),
    get: (id: string) => api<Order>(`/orders/${encodeURIComponent(id)}`),
    state: (id: string, state: string, notes?: string) =>
      api<Order>(`/orders/${encodeURIComponent(id)}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ state, notes }),
      }),
    exception: (
      id: string,
      lineId: string,
      reason: string,
      description: string
    ) =>
      api<Order>(
        `/orders/${encodeURIComponent(id)}/lines/${encodeURIComponent(
          lineId
        )}/exception`,
        { method: 'POST', body: JSON.stringify({ reason, description }) }
      ),
    reSource: (id: string, lineId: string, body: unknown) =>
      api<Order>(
        `/orders/${encodeURIComponent(id)}/lines/${encodeURIComponent(
          lineId
        )}/re-source`,
        { method: 'PATCH', body: JSON.stringify(body) }
      ),
    pick: (id: string, lineId: string, body: unknown = {}) =>
      api<Order>(
        `/orders/${encodeURIComponent(id)}/lines/${encodeURIComponent(
          lineId
        )}/pick`,
        { method: 'PATCH', body: JSON.stringify(body) }
      ),
  },

  partsCheck: {
    inbound: (body: unknown) =>
      api<unknown>('/partscheck/rfq', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(body),
      }),
    inbox: (query = '') =>
      api<RfqInboxResponse>(`/partscheck/rfq${query ? `?${query}` : ''}`),
    get: (id: string) =>
      api<unknown>(`/partscheck/rfq/${encodeURIComponent(id)}`),
    quote: (id: string, notes?: string) =>
      api<unknown>(`/partscheck/rfq/${encodeURIComponent(id)}/quote`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    override: (id: string, lineId: string, body: unknown) =>
      api<unknown>(
        `/partscheck/rfq/${encodeURIComponent(id)}/lines/${encodeURIComponent(
          lineId
        )}/override`,
        { method: 'PATCH', body: JSON.stringify(body) }
      ),
    accept: (id: string, body: unknown = {}) =>
      api<unknown>(`/partscheck/rfq/${encodeURIComponent(id)}/accept`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  dashboard: {
    group: () => api<GroupData>('/dashboard/group'),
    groupPartsCheck: () =>
      api<PartsCheckSummary>('/dashboard/group/partscheck'),
    store: (rooftopId: string) =>
      api<unknown>(`/dashboard/store/${encodeURIComponent(rooftopId)}`),
    storePartsCheck: (rooftopId: string) =>
      api<unknown>(
        `/dashboard/store/${encodeURIComponent(rooftopId)}/partscheck`
      ),
    weeklyExport: (query = '') =>
      api<unknown>(`/dashboard/export/weekly${query ? `?${query}` : ''}`),
  },

  audit: {
    list: (query = '') =>
      api<AuditResponse>(`/audit${query ? `?${query}` : ''}`),
  },
};
