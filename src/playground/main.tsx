import { useSyncExternalStore, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Box,
  CssBaseline,
  Fab,
  IconButton,
  Paper,
  Stack,
  ThemeProvider,
  ToggleButton,
  Typography,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { Route, Router, Switch, useLocation, type BaseLocationHook } from 'wouter'
import theme from '../theme'
import { I18nProvider } from '../i18n'
import { setDevAuthState, type AuthState } from '../hooks/auth'
import { setDevPinnedConfig, type SiteConfig } from '../hooks/config'
import Navbar from '../components/layout/navbar'
import Footer from '../components/layout/Footer'
import PageLayout from '../components/layout/PageLayout'
import PageContainer from '../components/layout/PageContainer'
import HomePage from '../pages/HomePage'
import About from '../pages/About'
import Menu from '../pages/Menu'
import Contact from '../pages/Contact'
import Hours from '../pages/Hours'
import Posts from '../pages/Posts'
import Order from '../pages/Order'
import Impressum from '../pages/Impressum'
import Datenschutz from '../pages/Datenschutz'
import { BodyText, Title } from '../components/ui/typography'
import ContentCard from '../components/ui/ContentCard'

// ---------------------------------------------------------------------------
// Dev-only component playground. Served by the Vite dev server at
// /playground.html; never part of the production build (Vite only bundles
// index.html), so it never reaches dist/ or the S3 bucket.
//
// Real Google OAuth only works on staging (the auth Lambda redirects the
// callback to SITE_URL), so login states are simulated via the dev-only
// setDevAuthState / setDevPinnedConfig seams in src/hooks/. The playground
// renders the real app shell (Navbar + every public page + Footer) inside an
// in-memory router, so navbar links navigate in place instead of leaving the
// playground — the home page with its hero carousel renders exactly like prod.
// ---------------------------------------------------------------------------

// In-memory router: navbar/CTA links update this store instead of the browser
// URL, so the playground never navigates away from /playground.html. The
// location must live in a module-level store (useSyncExternalStore) — wouter
// calls the router hook once per consumer, so a useState-based hook would give
// Navbar, pages and Links each their own copy and navigation would never reach
// the Switch.
let memoryLocation = '/'
const locationListeners = new Set<() => void>()

function subscribeLocation(listener: () => void) {
  locationListeners.add(listener)
  return () => {
    locationListeners.delete(listener)
  }
}

function getLocationSnapshot() {
  return memoryLocation
}

function navigateMemory(to: string) {
  memoryLocation = to
  for (const listener of locationListeners) listener()
}

const useMemoryLocation: BaseLocationHook = () => [
  useSyncExternalStore(subscribeLocation, getLocationSnapshot),
  navigateMemory,
]

type AuthKey = 'anonymous' | 'loading' | 'user' | 'admin'

const AUTH_STATES: Record<AuthKey, AuthState> = {
  anonymous: { status: 'anonymous', email: null, name: null, picture: null, isAdmin: false },
  loading: { status: 'loading', email: null, name: null, picture: null, isAdmin: false },
  user: {
    status: 'authenticated',
    email: 'gast@example.com',
    name: 'Max Mustermann',
    picture: null,
    isAdmin: false,
  },
  admin: {
    status: 'authenticated',
    email: 'admin@tong-tong.eu',
    name: 'Thomas Mohr',
    picture: null,
    isAdmin: true,
  },
}

const AUTH_LABELS: Record<AuthKey, string> = {
  anonymous: 'Anonym',
  loading: 'Session prüft…',
  user: 'Nicht-Admin',
  admin: 'Admin',
}

const ORDERING_CONFIG: Record<'on' | 'off', SiteConfig> = {
  on: { ordering: { enabled: true }, reservations: { enabled: false } },
  off: { ordering: { enabled: false }, reservations: { enabled: false } },
}

// Floating DEV panel (bottom right) with the state switchers. Collapsed to a
// small FAB by default so the page preview looks exactly like prod.
function DevToolbar() {
  const [open, setOpen] = useState(false)
  const [authKey, setAuthKey] = useState<AuthKey>(() => {
    setDevAuthState(AUTH_STATES.user)
    return 'user'
  })
  const [ordering, setOrdering] = useState<'on' | 'off'>(() => {
    setDevPinnedConfig(ORDERING_CONFIG.on)
    return 'on'
  })

  const selectAuth = (key: AuthKey) => {
    setAuthKey(key)
    setDevAuthState(AUTH_STATES[key])
  }
  const selectOrdering = (key: 'on' | 'off') => {
    setOrdering(key)
    setDevPinnedConfig(ORDERING_CONFIG[key])
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }}>
      {open ? (
        <Paper elevation={8} sx={{ p: 1.5, width: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              DEV Playground
            </Typography>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Playground-Steuerung ausblenden">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                Login-Zustand
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(Object.keys(AUTH_LABELS) as AuthKey[]).map((key) => (
                  <ToggleButton
                    key={key}
                    value={key}
                    size="small"
                    selected={authKey === key}
                    onClick={() => selectAuth(key)}
                    sx={{ borderRadius: '6px', px: 1 }}
                  >
                    {AUTH_LABELS[key]}
                  </ToggleButton>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                Online-Bestellung
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ToggleButton
                  size="small"
                  selected={ordering === 'on'}
                    value="on"
                  onClick={() => selectOrdering('on')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  Ein
                </ToggleButton>
                <ToggleButton
                  size="small"
                  selected={ordering === 'off'}
                    value="off"
                  onClick={() => selectOrdering('off')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  Aus
                </ToggleButton>
              </Box>
            </Box>
          </Stack>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            Simuliert — echtes OAuth läuft nur auf Staging.
          </Typography>
        </Paper>
      ) : (
        <Fab size="small" color="primary" onClick={() => setOpen(true)} aria-label="Playground-Steuerung anzeigen">
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700 }}>DEV</Typography>
        </Fab>
      )}
    </Box>
  )
}

function PrimitivesDemo() {
  return (
    <Paper sx={{ p: 2.5, mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Typografie & UI-Primitives
      </Typography>
      <Stack spacing={1.5}>
        <Title variant="h4">Willkommen bei Tong Tong</Title>
        <Title variant="h5" color="text.primary">
          Neutralere Überschrift (text.primary)
        </Title>
        <BodyText>
          Fließtext: Unser China-Restaurant Tong Tong ist seit über 30 Jahren Ihre Adresse für die
          traditionelle Küche Südchinas — traditionell verwurzelt und offen für Neues.
        </BodyText>
        <ContentCard>
          <Title variant="h6">ContentCard</Title>
          <BodyText>
            Die ContentCard ist der gemeinsame Paper-Wrapper für statische Inhaltsseiten (About,
            Impressum, Datenschutz).
          </BodyText>
        </ContentCard>
      </Stack>
    </Paper>
  )
}

// Shown for routes without a preview (there are none in the navbar) — keeps the
// typography demo reachable.
function PlaygroundFallback() {
  const [location] = useLocation()
  return (
    <PageContainer title="Playground">
      <Paper sx={{ p: 2.5, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Seiten-Vorschau
        </Typography>
        <BodyText>
          Diese Route („{location}“) hat im Playground keine Vorschau — über die Navbar zur
          Startseite zurückkehren.
        </BodyText>
      </Paper>
      <PrimitivesDemo />
    </PageContainer>
  )
}

function Playground() {
  return (
    <Router hook={useMemoryLocation}>
      <ThemeProvider theme={theme}>
        <I18nProvider>
          <CssBaseline />
          <DevToolbar />
          <Navbar />
          <PageLayout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/about" component={About} />
              <Route path="/menu" component={Menu} />
              <Route path="/contact" component={Contact} />
              <Route path="/hours" component={Hours} />
              <Route path="/posts" component={Posts} />
              <Route path="/order" component={Order} />
              <Route path="/impressum" component={Impressum} />
              <Route path="/datenschutz" component={Datenschutz} />
              <Route component={PlaygroundFallback} />
            </Switch>
          </PageLayout>
          <Footer />
        </I18nProvider>
      </ThemeProvider>
    </Router>
  )
}

createRoot(document.getElementById('root')!).render(<Playground />)
