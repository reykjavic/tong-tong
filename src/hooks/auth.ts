import { useSyncExternalStore } from 'react'
import { CONFIG_API_URL } from './config'

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
// Module-level store + useSyncExternalStore: same idiom as the config/posts
// module caches. getSnapshot must return a STABLE object reference (it does —
// state is replaced, never mutated).

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

// Initial state from token presence: a token means "validating" (loading), none
// means anonymous. Done synchronously so the first render never flashes a login
// button for someone who is actually signed in.
const INITIAL: AuthState =
  typeof window !== 'undefined' && window.localStorage.getItem(TOKEN_KEY)
    ? { status: 'loading', email: null, name: null, picture: null, isAdmin: false }
    : { status: 'anonymous', email: null, name: null, picture: null, isAdmin: false }

let state: AuthState = INITIAL
const listeners = new Set<() => void>()
let meCache: Promise<void> | null = null

function setState(next: AuthState) {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
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

// fetch() wrapper that attaches the session as a Bearer header.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${AUTH_API_URL}${path}`, { ...init, headers, cache: 'no-store' })
}

// Validate the stored token against /auth/me. Module-cached so concurrent
// callers (main.tsx bootstrap + Dashboard) share one request.
export function refreshAuth(): Promise<void> {
  meCache ??= (async () => {
    const token = getToken()
    if (!token) {
      setState({ status: 'anonymous', email: null, name: null, picture: null, isAdmin: false })
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
      setState({
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
      setState({ status: 'anonymous', email: null, name: null, picture: null, isAdmin: false })
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
  setState({ status: 'anonymous', email: null, name: null, picture: null, isAdmin: false })
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
    setState({ status: 'loading', email: null, name: null, picture: null, isAdmin: false })
  }
  window.history.replaceState({}, '', sanitizeNext(next))
}

// Same server-side rule: only same-site paths, never protocol-relative.
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
