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
