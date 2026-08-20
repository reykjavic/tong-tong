import { CONFIG_API_URL } from './config'
import { apiFetch } from './auth'

// Order data-access for the online-ordering pipeline (mockup stage).
//
//   placeMockOrder()  -> POST /orders         (public; gated server-side by the
//                                              ordering feature toggle)
//   fetchOrders()     -> GET  /staff/orders   (Google-session Bearer via apiFetch)
//
// Same idioms as posts.ts/config.ts: module constants, cache: 'no-store',
// apiFetch for the authed call.

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

// Same derivation as AUTH_API_URL in auth.ts: strip the /config suffix off the
// public config URL and point at the /orders route of the same API.
export const ORDERS_API_URL = CONFIG_API_URL.replace(/\/config$/, '/orders')

// Canned payload from the real menu. Total is omitted — the orders Lambda
// recomputes it server-side from the item prices.
const MOCK_ORDER = {
  items: [
    { name: 'Frühlingsrollen (2 Stk)', qty: 1, price: 3.9 },
    { name: 'Gebackener Reis mit Huhn', qty: 1, price: 8.5 },
  ],
  channel: 'whatsapp',
  contact: '+49 150 1234567',
}

export interface PlacedOrder {
  orderId: string
  status: OrderStatus
  createdAt: string
  total: number
}

// Dev-only fixture for the component playground (src/playground): served by
// the dev API mock (src/hooks/devApi.ts) for GET /staff/orders, so the
// Dashboard's orders view renders real-looking data locally. Timestamps are
// relative to load time so the list always looks fresh. Production builds
// never touch this (the mock is only reachable from apiFetch in DEV).
export const MOCK_ORDERS: Order[] = [
  {
    orderId: 'd4f1a2b3-8c1e-4f2a-9b3c-1e2d3f4a5b6c',
    status: 'Pending',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items: [
      { name: 'Frühlingsrollen (2 Stk)', qty: 2, price: 3.9 },
      { name: 'Ente süß-sauer', qty: 1, price: 12.8 },
      { name: 'Gebackener Reis mit Huhn', qty: 2, price: 8.5 },
    ],
    total: 37.6,
    channel: 'whatsapp',
    contact: '+49 160 9876543',
    notifiedAt: null,
  },
  {
    orderId: '9c2e8f41-5b7d-4a0c-9f3e-8a1b2c3d4e5f',
    status: 'Notified',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    items: [
      { name: 'Peking-Suppe', qty: 1, price: 4.9 },
      { name: 'Hähnchen süß-sauer', qty: 1, price: 11.9 },
    ],
    total: 16.8,
    channel: 'email',
    contact: 'karla@example.de',
    notifiedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    orderId: '6b7d9a03-2c4e-4f8a-9b1d-7c5e6f7a8b9c',
    status: 'Completed',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    items: [
      { name: 'Gemüsepfanne mit Reis', qty: 1, price: 9.9 },
      { name: 'Kokosmilch (0,3 l)', qty: 2, price: 2.5 },
    ],
    total: 14.9,
    channel: 'whatsapp',
    contact: '+49 171 5551234',
    notifiedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  },
]

export async function placeMockOrder(): Promise<PlacedOrder> {
  const res = await fetch(ORDERS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(MOCK_ORDER),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`order placement failed: ${res.status}`)
  }
  return (await res.json()) as PlacedOrder
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await apiFetch('/staff/orders')
  if (!res.ok) {
    throw new Error(`staff orders failed: ${res.status}`)
  }
  const data = (await res.json()) as { orders: Order[] }
  return data.orders ?? []
}
