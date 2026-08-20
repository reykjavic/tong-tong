import { useEffect, useSyncExternalStore } from 'react'

export interface FeatureFlag {
  enabled: boolean
}

export interface SiteConfig {
  ordering: FeatureFlag
  reservations: FeatureFlag
}

export type ConfigStatus = 'loading' | 'ready' | 'error'

// GET /config on the SAM API Gateway (eu-central-1, Prod stage), reached via the
// stable custom domain api.tong-tong.eu (API Gateway regional + Route 53 alias)
// instead of the CloudFormation-assigned execute-api id — that id persists across
// redeploys but changes if the stack is ever deleted and recreated, which would
// have silently broken fail-open config fetches (see below).
export const CONFIG_API_URL =
  'https://api.tong-tong.eu/Prod/config'

// Fail-open defaults: preserve today's UI (ordering visible, no reservation UI)
// while loading and on fetch failure. Only a definitive `false` from the API
// hides the ordering UI. The server side is the authoritative gate (SCOPE.md
// §12) — it fail-closes on a missing item, which is the deliberate asymmetry.
// Exported so the dev API mock (devApi.ts) can fall back to it when no
// playground config is pinned.
export const DEFAULT_CONFIG: SiteConfig = {
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

// Module-scoped promise cache: Navbar, Menu and Dashboard share one fetch, and
// React StrictMode's double effect reuses the same promise instead of fetching
// twice. A failed fetch clears it so the next call retries.
let cache: Promise<SiteConfig> | null = null
export function getConfig(): Promise<SiteConfig> {
  cache ??= fetchConfig().catch((err) => {
    cache = null
    throw err
  })
  return cache
}

// Reactive module store (same idiom as src/hooks/auth.ts). The POST /toggle
// response in the Dashboard publishes the fresh config via setConfig(), so
// already-mounted consumers (Navbar, Menu) re-render on the current route
// instead of waiting for the next full page load.
type ConfigSnapshot = { status: ConfigStatus; config: SiteConfig }

const LOADING_SNAPSHOT: ConfigSnapshot = { status: 'loading', config: DEFAULT_CONFIG }

let snapshot: ConfigSnapshot = LOADING_SNAPSHOT
const listeners = new Set<() => void>()

function setSnapshot(next: ConfigSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

// Publish the authoritative config (e.g. the POST /toggle response) to every
// live subscriber — the navbar's ordering link flips without a reload.
export function setConfig(config: SiteConfig) {
  setSnapshot({ status: 'ready', config })
}

// Dev-only pin for the component playground (src/playground): pins a config
// locally so states like "ordering hidden" can be tested without the staging
// API overwriting it the moment the fetch resolves. No-op in production.
let devPinnedConfig: SiteConfig | null = null
export function setDevPinnedConfig(config: SiteConfig | null) {
  if (!import.meta.env.DEV) return
  devPinnedConfig = config
  if (config) setConfig(config)
}

// Read the pinned config — the dev API mock (devApi.ts) uses it as the base
// state for POST /toggle so the playground stays the single source of truth.
export function getDevPinnedConfig(): SiteConfig | null {
  return devPinnedConfig
}

export function useConfig(): ConfigSnapshot {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    if (devPinnedConfig) {
      setConfig(devPinnedConfig)
      return
    }
    getConfig()
      .then((result) => setConfig(result))
      .catch((err) => {
        console.error('Failed to load feature config:', err)
        setSnapshot({ status: 'error', config: snapshot.config })
      })
  }, [])

  return snap
}
