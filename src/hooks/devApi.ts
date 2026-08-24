import { DEFAULT_CONFIG, getDevPinnedConfig, setDevPinnedConfig, type SiteConfig } from './config'
import { MOCK_ORDERS, type Order, type OrderStatus } from './orders'

// Dev-only mock for the authed API endpoints the Dashboard uses. The real
// endpoints (POST /toggle, GET /staff/orders, PATCH /staff/orders/:id/status,
// DELETE /staff/orders/:id) only exist on the staging backend, so without this
// the component playground (src/playground) would only ever show the
// Dashboard's error states. apiFetch (src/hooks/auth.ts) calls this first in
// dev builds and returns the mock Response when the path matches; in
// production builds this file is never reached.
//
// The toggle mock reads the playground's pinned config (setDevPinnedConfig)
// as its base state, applies the flip locally and keeps the pin in sync — the
// Dashboard then publishes the response via setConfig, exactly like the real
// backend round-trip, so the navbar's ordering link reacts to the flip.
//
// Orders live in a mutable module store seeded from MOCK_ORDERS so status
// changes and deletes persist across renders within a dev session (the real
// backend keeps them in DynamoDB). GET mirrors the backend and only returns
// open orders (Pending + Notified) — Completed ones drop out of the list.

// Mutable copy: never mutate the exported MOCK_ORDERS fixture itself.
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
