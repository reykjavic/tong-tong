import { DEFAULT_CONFIG, getDevPinnedConfig, setDevPinnedConfig, type Order, type OrderStatus, type SiteConfig } from './api'

// Dev-only mock for the authed API endpoints the Dashboard uses. The real
// endpoints (POST /toggle, GET /staff/orders, PATCH /staff/orders/:id/status,
// DELETE /staff/orders/:id) only exist on the staging backend, so without this
// the component playground (src/playground) would only ever show the
// Dashboard's error states. apiFetch (src/hooks/api.ts) calls this first in
// dev builds and returns the mock Response when the path matches; in
// production builds this file is never reached.
//
// The toggle mock reads the playground's pinned config (setDevPinnedConfig)
// as its base state, applies the flip locally and keeps the pin in sync — the
// Dashboard then publishes the response via setConfig, exactly like the real
// backend round-trip, so the navbar's ordering link reacts to the flip.
//
// Orders live in a mutable module store seeded from MOCK_ORDERS (the fixture
// lived in orders.ts before the api consolidation) so status changes and
// deletes persist across renders within a dev session (the real backend keeps
// them in DynamoDB). GET mirrors the backend and only returns open orders
// (Pending + Notified) — Completed ones drop out of the list.

// Dev fixtures: timestamps are relative to load time so the list always looks
// fresh. Production builds never touch this.
const MOCK_ORDERS: Order[] = [
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

// Mutable copy: never mutate the fixture itself.
let ordersStore: Order[] = MOCK_ORDERS.map((o) => ({ ...o, items: [...o.items] }))

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// /staff/orders/<uuid>[/status] — matches the SAM route templates.
const ORDER_PATH = /^\/staff\/orders\/([^/]+)(\/status)?$/

export function devApiFetch(path: string, init: RequestInit): Response | null {
  // POST /toggle — flip one feature flag locally.
  if (init.method === 'POST' && path === '/toggle') {
    const body = JSON.parse(String(init.body ?? '{}')) as {
      feature: 'ordering' | 'reservations'
      enabled: boolean
    }
    const base = getDevPinnedConfig() ?? DEFAULT_CONFIG
    const next: SiteConfig = {
      ordering: { enabled: body.feature === 'ordering' ? body.enabled : base.ordering.enabled },
      reservations: {
        enabled: body.feature === 'reservations' ? body.enabled : base.reservations.enabled,
      },
    }
    setDevPinnedConfig(next) // keep the playground pin in sync with toggle flips
    return jsonResponse(next)
  }

  // GET /staff/orders — open orders only, newest first (mirrors the backend).
  if ((init.method ?? 'GET') === 'GET' && path === '/staff/orders') {
    const open = ordersStore
      .filter((o) => o.status === 'Pending' || o.status === 'Notified')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return jsonResponse({ orders: open })
  }

  // PATCH /staff/orders/:id/status — move an order through the lifecycle.
  const match = init.method === 'PATCH' ? ORDER_PATH.exec(path) : null
  if (match && match[2] === '/status') {
    const order = ordersStore.find((o) => o.orderId === match[1])
    if (!order) return jsonResponse({ error: 'order not found' }, 404)
    const body = JSON.parse(String(init.body ?? '{}')) as { status?: OrderStatus }
    if (body.status !== 'Pending' && body.status !== 'Notified' && body.status !== 'Completed') {
      return jsonResponse({ error: 'invalid status' }, 400)
    }
    order.status = body.status
    return jsonResponse({ orderId: order.orderId, status: order.status })
  }

  // DELETE /staff/orders/:id — hard delete.
  const delMatch = init.method === 'DELETE' ? ORDER_PATH.exec(path) : null
  if (delMatch) {
    const index = ordersStore.findIndex((o) => o.orderId === delMatch[1])
    if (index === -1) return jsonResponse({ error: 'order not found' }, 404)
    ordersStore.splice(index, 1)
    return jsonResponse({ deleted: delMatch[1] })
  }

  return null
}
