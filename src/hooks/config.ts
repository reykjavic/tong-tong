import { useEffect, useState } from 'react'

export interface FeatureFlag {
  enabled: boolean
}

export interface SiteConfig {
  ordering: FeatureFlag
  reservations: FeatureFlag
}

export type ConfigStatus = 'loading' | 'ready' | 'error'

// GET /config on the SAM API Gateway (eu-central-1, Prod stage). The API id is
// assigned by CloudFormation on the first deploy of the tong-tong-backend stack;
// it persists across redeploys but changes if the stack is ever deleted and
// recreated (fail-open masks that silently — see below). When the backend gets
// a stable URL (tong-tong.eu cutover work in TODO.md), swap this for it.
export const CONFIG_API_URL =
  'https://9i8zsjxhgj.execute-api.eu-central-1.amazonaws.com/Prod/config'

// Fail-open defaults: preserve today's UI (ordering visible, no reservation UI)
// while loading and on fetch failure. Only a definitive `false` from the API
// hides the ordering UI. The server side is the authoritative gate (SCOPE.md
// §12) — it fail-closes on a missing item, which is the deliberate asymmetry.
const DEFAULT_CONFIG: SiteConfig = {
  ordering: { enabled: true },
  reservations: { enabled: false },
}

async function fetchConfig(): Promise<SiteConfig> {
  const res = await fetch(CONFIG_API_URL, { cache: 'no-store' })
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

// Module-scoped cache: Navbar and Menu share one fetch, and React StrictMode's
// double effect reuses the same promise instead of fetching twice.
let cache: Promise<SiteConfig> | null = null
export function getConfig(): Promise<SiteConfig> {
  cache ??= fetchConfig().catch((err) => {
    // A failed fetch must not poison the cache forever — clear it so the next
    // call retries instead of reusing a rejected promise.
    cache = null
    throw err
  })
  return cache
}

export function useConfig() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<ConfigStatus>('loading')

  useEffect(() => {
    let alive = true
    getConfig()
      .then((result) => {
        if (!alive) return
        setConfig(result)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('Failed to load feature config:', err)
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  // Consumers just read config.ordering.enabled: the fail-open default covers
  // loading and error states.
  return { status, config }
}
