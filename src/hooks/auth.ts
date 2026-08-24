import { create } from 'zustand'
import { CONFIG_API_URL } from './config'
import { devApiFetch } from './devApi'

// Auth state for the admin dashboard (Google OAuth, backend/lambdas/auth).
//
// The session is an opaque bearer token in localStorage['tt-auth'] — no cookies
// (the API and the site are on different origins, and a bearer header also means
// no CSRF surface). The token is minted server-side for ANY verified Google
// account and expires in 7 days (DynamoDB TTL); ADMIN_EMAIL only gates the admin
// endpoints (/toggle, /staff), not login. Login is a full-page redirect to
// AUTH_API_URL/auth/login; the callback lands back on ?auth_token=…&next=… which
// consumeAuthToken() strips and stores (see src/main.tsx). /auth/me also returns
// the Google profile (name, picture) and an isAdmin flag so the navbar can show
// who is signed in and whether the dashboard is available.
//
// Client state via Zustand: the session slice is the store; the actions below
// (refreshAuth/login/logout/consumeAuthToken) are plain module functions that
// write to it via useAuthStore.getState(). Token stays in localStorage.

export const AUTH_API_URL = CONFIG_API_URL.replace(/\/config$/, '')

export const TOKEN_KEY = 'tt-auth'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthState {
  status: AuthStatus
  email: string | null
  name: string | null
  picture: string | null
  isAdmin: boolean
}

const ANONYMOUS: AuthState = { status: 'anonymous', email: null, name: null, picture: null, isAdmin: false }
const LOADING: AuthState = { status: 'loading', email: null, name: null, picture: null, isAdmin: false }

// Initial state from token presence: a token means "validating" (loading), none
// means anonymous. Done synchronously so the first render never flashes a login
// button for someone who is actually signed in.
const INITIAL_SESSION: AuthState =
  typeof window !== 'undefined' && window.localStorage.getItem(TOKEN_KEY) ? LOADING : ANONYMOUS

interface AuthStore {
  session: AuthState
  setSession: (session: AuthState) => void
  patchSession: (patch: Partial<AuthState>) => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  session: INITIAL_SESSION,
  setSession: (session) => set({ session }),
  patchSession: (patch) => set((s) => ({ session: { ...s.session, ...patch } })),
}))

// Selector hook — consumers re-render only when the session slice changes
// (Zustand compares the selected value by reference; the session object is
// replaced, never mutated).
export function useAuth(): AuthState {
  return useAuthStore((s) => s.session)
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

// fetch() wrapper that attaches the session as a Bearer header. In dev builds
// the Dashboard's endpoints (toggles, orders) are answered by a local mock
// (devApi.ts) because the real backend only exists on staging — production
// builds skip the mock entirely.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (import.meta.env.DEV) {
    const mock = devApiFetch(path, init)
    if (mock) return mock
  }
  return fetch(`${AUTH_API_URL}${path}`, { ...init, headers, cache: 'no-store' })
}

// Validate the stored token against /auth/me. Module-cached so concurrent
// callers (main.tsx bootstrap + Dashboard) share one request.
let meCache: Promise<void> | null = null

export function refreshAuth(): Promise<void> {
  meCache ??= (async () => {
    const token = getToken()
    if (!token) {
      useAuthStore.getState().setSession(ANONYMOUS)
      return
    }
    try {
      const res = await apiFetch('/auth/me')
      if (!res.ok) throw new Error(`auth/me failed: ${res.status}`)
      const data = (await res.json()) as {
        email?: string
        name?: string | null
        picture?: string | null
        isAdmin?: boolean
      }
      useAuthStore.getState().setSession({
        status: 'authenticated',
        email: data.email ?? null,
        name: data.name ?? null,
        picture: data.picture ?? null,
        isAdmin: data.isAdmin ?? false,
      })
    } catch (err) {
      // Expired/invalid session — clear it; the dashboard will show the prompt.
      console.error('Failed to validate session:', err)
      clearToken()
      useAuthStore.getState().setSession(ANONYMOUS)
    }
  })()
  return meCache
}

// Full-page redirect to the OAuth entry point. The callback 302s back to
// SITE_URL/?auth_token=…&next=<encoded> and the reload runs consumeAuthToken().
export function login(next?: string) {
  const target = next ?? window.location.pathname
  window.location.assign(`${AUTH_API_URL}/auth/login?next=${encodeURIComponent(target)}`)
}

export async function logout(): Promise<void> {
  meCache = null
  try {
    if (getToken()) await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Best effort — clear locally regardless.
  }
  clearToken()
  useAuthStore.getState().setSession(ANONYMOUS)
}

// Consume the OAuth callback parameters (?auth_token=…&next=…): store the token,
// strip the query from the URL via history.replaceState so it never sits in
// back-history, and land on `next` (defaults to /). Run once before React
// renders (src/main.tsx) so wouter mounts on the right initial location.
export function consumeAuthToken(): void {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('auth_token')
  const next = params.get('next')
  if (!token && !next) return
  if (token) {
    setToken(token)
    useAuthStore.getState().setSession(LOADING)
  }
  window.history.replaceState({}, '', sanitizeNext(next))
}

// Same server-side rule: only same-site paths, never protocol-relative.
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

// Dev-only helper for the component playground (src/playground): real Google
// OAuth only works on staging (the auth Lambda redirects the callback to
// SITE_URL), so the playground simulates signed-in states locally. No-op in
// production builds.
export function setDevAuthState(next: Partial<AuthState>): void {
  if (!import.meta.env.DEV) return
  useAuthStore.getState().patchSession(next)
}
