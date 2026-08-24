import { useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, Paper, Stack, ThemeProvider, Typography } from '@mui/material'
import { Route, Router, Switch, useLocation, type BaseLocationHook } from 'wouter'
import theme from '../theme'
import { I18nProvider } from '../i18n'
import { setDevAuthState } from '../hooks/auth'
import { setDevPinnedConfig } from '../hooks/api'
import { queryClient } from '../hooks/queryClient'
import DevToolbar, { AUTH_STATES, ORDERING_CONFIG } from '../components/features/DevToolbar'
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
import Dashboard from '../pages/Dashboard'
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
//
// The floating DEV toolbar is the shared DevToolbar component (also mounted on
// the main app in dev builds); the playground seeds its simulated states here
// so the preview opens with a logged-in (non-admin) user and ordering enabled.
// ---------------------------------------------------------------------------

// Seed the simulated states the DEV toolbar controls. Runs at module load,
// before React renders; the toolbar derives its selection from the live stores.
setDevAuthState(AUTH_STATES.user)
setDevPinnedConfig(ORDERING_CONFIG.on)

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
    <QueryClientProvider client={queryClient}>
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
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/impressum" component={Impressum} />
                <Route path="/datenschutz" component={Datenschutz} />
                <Route component={PlaygroundFallback} />
              </Switch>
            </PageLayout>
            <Footer />
          </I18nProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Playground />)
