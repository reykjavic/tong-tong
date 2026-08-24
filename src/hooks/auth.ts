import { create } from 'zustand'
import {
  API_BASE_URL,
  TOKEN_KEY,
  apiUrls,
  clearToken,
  fetchAuthMe,
  getToken,
  logoutSession,
  setToken,
} from './api'

// Auth state for the admin dashboard (Google OAuth, backend/lambdas/auth).
//
// The session is an opaque bearer token in localStorage['tt-auth'] — no cookies
// (the API and the site are on different origins, and a bearer header also means
// no CSRF surface). The token is minted server-side for ANY verified Google
// account and expires in 7 days (DynamoDB TTL); ADMIN_EMAIL only gates the admin
// endpoints (/toggle, /staff), not login. Login is a full-page redirect to
// (apiUrls.login; the callback lands back on ?auth_token=…&next=… which
// consumeAuthToken() strips and stores (see src/main.tsx). /auth/me also returns
// the Google profile (name, picture) and an isAdmin flag so the navbar can show
// who is signed in and whether the dashboard is available.
//
// Client state via Zustand (data layer standard — see AGENTS.md). The transport
// (token, apiFetch, /auth/me + /auth/logout endpoints) lives in src/hooks/api.ts.

// Re-exported for existing importers (main.tsx, Navbar).
export { TOKEN_KEY, getToken, clearToken } from './api'

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
// (the session object is replaced, never mutated).
export function useAuth(): AuthState {
  return useAuthStore((s) => s.session)
}

// Validate the stored token against /auth/me. Module-cached so concurrent
// callers (main.tsx bootstrap + Dashboard) share one request.
let meCache: Promise<void> | null = null

export function refreshAuth(): Promise<void> {
  meCache ??= (async () => {
    if (!getToken()) {
      useAuthStore.getState().setSession(ANONYMOUS)
      return
    }
    try {
      const data = await fetchAuthMe()
      useAuthStore.getState().setSession({
        status: 'authenticated',
        email: data.email,
        name: data.name,
        picture: data.picture,
        isAdmin: data.isAdmin,
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
  window.location.assign(`${API_BASE_URL}${apiUrls.login}?next=${encodeURIComponent(target)}`)
}

export async function logout(): Promise<void> {
  meCache = null
  try {
    if (getToken()) await logoutSession()
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
