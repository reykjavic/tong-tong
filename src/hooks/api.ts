import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { devApiFetch } from './devApi'
import { queryClient } from './queryClient'
import type { HoursPayload, HoursSnapshot } from './hours'

// ---------------------------------------------------------------------------
// THE API FILE — every request the app makes lives here: base URLs, query
// keys, the fetch transport, all endpoint functions and the TanStack Query
// hooks. Pure non-request logic stays in its own module (hours mapping in
// hours.ts, markdown/parsing in posts.ts). Pattern mirrors an RTK Query API
// slice; see AGENTS.md for the data-layer standard.
// ---------------------------------------------------------------------------

// ---- URLs (single registry — every URL the app fetches) --------------------
// The browser only talks to our own API + GitHub. Google's Places API is NOT
// called from the frontend: the backend/hours Lambda relays it
// (https://places.googleapis.com/v1/places/{placeId}, see
// backend/lambdas/hours/index.mjs) so the API key never ships to the client.

export const API_BASE_URL = 'https://api.tong-tong.eu/Prod'

const GITHUB_OWNER = 'reykjavic'
const GITHUB_REPO = 'tong-tong'
const GITHUB_BRANCH = 'main'
const POSTS_DIR = 'content/posts'

// Our API entries are paths relative to API_BASE_URL (apiFetch prepends the
// base); external services (GitHub) are absolute.
export const apiUrls = {
  config: '/config', // GET — feature toggles
  login: '/auth/login', // GET — Google OAuth entry (+ ?next=)
  authMe: '/auth/me', // GET — session/profile, Bearer
  logout: '/auth/logout', // POST — revoke session, Bearer
  toggle: '/toggle', // POST — admin feature flip, Bearer + ADMIN_EMAIL
  hours: '/hours', // GET — Google hours relay (cached 24h)
  ordersCreate: '/orders', // POST — public order intake (ordering-toggle gate)
  staffOrders: '/staff/orders', // GET — open orders, Bearer + ADMIN_EMAIL
  staffOrderStatus: (id: string) => `/staff/orders/${id}/status`, // PATCH
  staffOrder: (id: string) => `/staff/orders/${id}`, // DELETE
  githubContents: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}?ref=${GITHUB_BRANCH}`, // GET — Decap post listing
  githubRaw: (path: string) =>
    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`, // GET — raw post/media file
} as const

// ---- Config: GET /config (public feature toggles) --------------------------

export interface FeatureFlag {
  enabled: boolean
}

export interface SiteConfig {
  ordering: FeatureFlag
  reservations: FeatureFlag
}

export type ConfigStatus = 'loading' | 'ready' | 'error'

// Fail-open defaults: preserve today's UI (ordering visible, no reservation
// UI) while loading and on fetch failure. Only a definitive `false` from the
// API hides the ordering UI. The server side is the authoritative gate (SCOPE
// §12) — it fail-closes on a missing item, the deliberate asymmetry.
export const DEFAULT_CONFIG: SiteConfig = {
  ordering: { enabled: true },
  reservations: { enabled: false },
}

// Dev-only pin for the component playground: pins a config locally so states
// like "ordering hidden" can be tested; the dev API mock reads it. No-op in
// production builds.
let devPinnedConfig: SiteConfig | null = null
export function setDevPinnedConfig(config: SiteConfig | null) {
  if (!import.meta.env.DEV) return
  devPinnedConfig = config
  if (config) setConfig(config)
}
export function getDevPinnedConfig(): SiteConfig | null {
  return devPinnedConfig
}

// ---- Token / fetch transport (was auth.ts) ---------------------------------

export const TOKEN_KEY = 'tt-auth'

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

// fetch() wrapper that attaches the session as a Bearer header. In dev builds
// the dashboard's endpoints (toggles, orders) are answered by a local mock
// (devApi.ts); production builds skip the mock entirely.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (import.meta.env.DEV) {
    const mock = devApiFetch(path, init)
    if (mock) return mock
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' })
}

// ---- Query keys (single source; mutations invalidate by these) -------------

export const queryKeys = {
  config: ['config'] as const,
  hours: ['hours'] as const,
  orders: ['orders'] as const,
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// GET /config — feature toggles; fail-open to DEFAULT_CONFIG.
async function fetchConfig(): Promise<SiteConfig> {
  const res = await fetch(`${API_BASE_URL}${apiUrls.config}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`config request failed: ${res.status}`)
  }
  const data = (await res.json()) as Partial<SiteConfig>
  return {
    ordering: { enabled: data.ordering?.enabled ?? DEFAULT_CONFIG.ordering.enabled },
    reservations: {
      enabled: data.reservations?.enabled ?? DEFAULT_CONFIG.reservations.enabled,
    },
  }
}

// GET /hours — real opening hours from the Google Business Profile (Places
// API), cached 24h server-side; the SPA computes the table/chip from it.
async function fetchHours(): Promise<HoursPayload> {
  const res = await fetch(`${API_BASE_URL}${apiUrls.hours}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`hours request failed: ${res.status}`)
  }
  return (await res.json()) as HoursPayload
}

// GET /staff/orders — open orders (Pending + Notified), newest first; Bearer.
export interface OrderItem {
  name: string
  qty: number
  price: number
}

export type OrderStatus = 'Pending' | 'Notified' | 'Completed'

export interface Order {
  orderId: string
  status: OrderStatus | null
  createdAt: string | null
  items: OrderItem[]
  total: number
  channel: 'email' | 'whatsapp' | null
  contact: string | null
  notifiedAt: string | null
}

async function fetchOrders(): Promise<Order[]> {
  const res = await apiFetch(apiUrls.staffOrders)
  if (!res.ok) {
    throw new Error(`staff orders failed: ${res.status}`)
  }
  const data = (await res.json()) as { orders: Order[] }
  return data.orders ?? []
}

// PATCH /staff/orders/:id/status — move an order through the lifecycle
// (Pending -> Notified -> Completed); Bearer + ADMIN_EMAIL.
async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const res = await apiFetch(apiUrls.staffOrderStatus(orderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    throw new Error(`status update failed: ${res.status}`)
  }
}

// DELETE /staff/orders/:id — hard delete (GDPR erasure / mockup cleanup);
// Bearer + ADMIN_EMAIL. The UI asks for confirmation first.
async function deleteOrder(orderId: string): Promise<void> {
  const res = await apiFetch(apiUrls.staffOrder(orderId), { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`order delete failed: ${res.status}`)
  }
}

// POST /orders — public order intake; gated server-side by the ordering
// toggle (403 when off). Total is recomputed server-side.
export interface PlacedOrder {
  orderId: string
  status: OrderStatus
  createdAt: string
  total: number
}

export async function placeOrder(body: {
  items: { name: string; qty: number; price: number }[]
  channel: 'email' | 'whatsapp'
  contact: string
}): Promise<PlacedOrder> {
  const res = await fetch(`${API_BASE_URL}${apiUrls.ordersCreate}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`order placement failed: ${res.status}`)
  }
  return (await res.json()) as PlacedOrder
}

// Canned payload from the real menu (mockup-stage fixture for the /order
// page's write button). Total is omitted — the orders Lambda recomputes it
// server-side from the item prices.
const MOCK_ORDER: {
  items: { name: string; qty: number; price: number }[]
  channel: 'email' | 'whatsapp'
  contact: string
} = {
  items: [
    { name: 'Frühlingsrollen (2 Stk)', qty: 1, price: 3.9 },
    { name: 'Gebackener Reis mit Huhn', qty: 1, price: 8.5 },
  ],
  channel: 'whatsapp',
  contact: '+49 150 1234567',
}

export function placeMockOrder(): Promise<PlacedOrder> {
  return placeOrder(MOCK_ORDER)
}

// POST /toggle — admin flip a feature flag; Bearer + ADMIN_EMAIL. Returns the
// authoritative config, which the caller publishes via setConfig().
export async function setToggle(
  feature: 'ordering' | 'reservations',
  enabled: boolean,
): Promise<SiteConfig> {
  const res = await apiFetch(apiUrls.toggle, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature, enabled }),
  })
  if (!res.ok) {
    throw new Error(`toggle failed: ${res.status}`)
  }
  return (await res.json()) as SiteConfig
}

// GET /auth/me — validate the session, return the Google profile + isAdmin.
export interface AuthMe {
  email: string
  name: string | null
  picture: string | null
  isAdmin: boolean
}

export async function fetchAuthMe(): Promise<AuthMe> {
  const res = await apiFetch(apiUrls.authMe)
  if (!res.ok) {
    throw new Error(`auth/me failed: ${res.status}`)
  }
  return (await res.json()) as AuthMe
}

// POST /auth/logout — revoke the session server-side (best effort).
export async function logoutSession(): Promise<void> {
  await apiFetch(apiUrls.logout, { method: 'POST' })
}

// GitHub (Decap CMS posts) — list the post directory + read one raw file.
async function fetchPostsList(): Promise<string[]> {
  const res = await fetch(apiUrls.githubContents, { cache: 'no-store' })
  if (res.status === 404) return [] // no posts directory on GitHub yet
  if (!res.ok) {
    throw new Error(`GitHub contents request failed: ${res.status}`)
  }
  const entries = (await res.json()) as { name: string }[]
  return entries.map((entry) => entry.name)
}

// 'no-store' guarantees a fresh 200 with a body (avoids 304 responses whose
// body fetch() can fail to materialize).
async function fetchPostRaw(name: string): Promise<string> {
  const res = await fetch(apiUrls.githubRaw(`${POSTS_DIR}/${name}`), { cache: 'no-store' })
  if (!res.ok) throw new Error(`post fetch failed: ${res.status}`)
  return res.text()
}

// ---------------------------------------------------------------------------
// Hooks (server state via TanStack Query)
// ---------------------------------------------------------------------------

// Config: fail-open to DEFAULT_CONFIG while loading / on error. The dev pin,
// when set, short-circuits the fetch so the playground controls the value.
export function useConfig(): { status: ConfigStatus; config: SiteConfig } {
  const query = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => getDevPinnedConfig() ?? (await fetchConfig()),
    staleTime: 5 * 60 * 1000,
  })
  return {
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    config: query.data ?? DEFAULT_CONFIG,
  }
}

// Publish the authoritative config (POST /toggle response) into the query
// cache — already-mounted consumers re-render without a reload.
export function setConfig(config: SiteConfig) {
  queryClient.setQueryData(queryKeys.config, config)
}

// Hours: no periodic client refresh (the Lambda caches 24h); freshness comes
// from each mount + refetchOnWindowFocus. Fail-open to `hours: null`.
export function useHours(): HoursSnapshot {
  const query = useQuery({
    queryKey: queryKeys.hours,
    queryFn: fetchHours,
    staleTime: 5 * 60 * 1000,
  })
  return {
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    hours: query.data ?? null,
  }
}

// Orders: the kitchen's open-orders list. `enabled` = session confirmed
// (baseline load always happens once); `poll` = only while the restaurant is
// open — the 15s refetchInterval is skipped otherwise, and TanStack pauses
// interval refetches in background tabs by default (focus catches up on
// return). "Polling has a pattern or a limit."
export function useOrdersQuery(enabled: boolean, poll: boolean) {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: fetchOrders,
    enabled,
    refetchInterval: poll ? 15_000 : false,
  })
}

export function useSetOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    // Refetch so Completed orders drop out and the list reflects the change.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
  })
}

export { fetchPostsList, fetchPostRaw }
