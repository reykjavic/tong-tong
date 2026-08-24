import { useQuery } from '@tanstack/react-query'
import { queryClient } from './queryClient'

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

const CONFIG_QUERY_KEY = ['config'] as const

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

// Publish the authoritative config (e.g. the POST /toggle response) into the
// query cache — already-mounted consumers (Navbar, Menu) re-render on the
// current route instead of waiting for the next full page load.
export function setConfig(config: SiteConfig) {
  queryClient.setQueryData(CONFIG_QUERY_KEY, config)
}

// Server state via TanStack Query; fail-open to DEFAULT_CONFIG while loading
// or on error (same semantics as the old module store). The dev pin, when
// set, short-circuits the fetch so the playground controls the value.
export function useConfig(): { status: ConfigStatus; config: SiteConfig } {
  const query = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: async () => getDevPinnedConfig() ?? (await fetchConfig()),
    staleTime: 5 * 60 * 1000,
  })
  return {
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    config: query.data ?? DEFAULT_CONFIG,
  }
}
