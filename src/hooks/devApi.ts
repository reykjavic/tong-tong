import { DEFAULT_CONFIG, getDevPinnedConfig, setDevPinnedConfig, type SiteConfig } from './config'
import { MOCK_ORDERS } from './orders'

// Dev-only mock for the authed API endpoints the Dashboard uses. The real
// endpoints (POST /toggle, GET /staff/orders) only exist on the staging
// backend, so without this the component playground (src/playground) would
// only ever show the Dashboard's error states. apiFetch (src/hooks/auth.ts)
// calls this first in dev builds and returns the mock Response when the path
// matches; in production builds this file is never reached.
//
// The toggle mock reads the playground's pinned config (setDevPinnedConfig)
// as its base state, applies the flip locally and keeps the pin in sync — the
// Dashboard then publishes the response via setConfig, exactly like the real
// backend round-trip, so the navbar's ordering link reacts to the flip.

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

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

  // GET /staff/orders — serve the mock fixtures.
  if ((init.method ?? 'GET') === 'GET' && path === '/staff/orders') {
    return jsonResponse({ orders: MOCK_ORDERS })
  }

  return null
}
