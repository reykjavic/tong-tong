import { lazy, Suspense, useEffect } from 'react'
import { Switch, Route, useLocation } from 'wouter'
import { CssBaseline, Box, CircularProgress, ThemeProvider } from '@mui/material'
import theme from './theme'
import { I18nProvider } from './i18n'
import Navbar from './components/layout/Navbar'
import PageMeta from './components/features/PageMeta'
import Footer from './components/layout/Footer'
import PageLayout from './components/layout/PageLayout'

// Route-level code splitting: each page loads in its own chunk on first visit,
// keeping the initial bundle small.
const Home = lazy(() => import('./pages/HomePage'))
const About = lazy(() => import('./pages/About'))
const Menu = lazy(() => import('./pages/Menu'))
const Contact = lazy(() => import('./pages/Contact'))
const Hours = lazy(() => import('./pages/Hours'))
const Impressum = lazy(() => import('./pages/Impressum'))
const Datenschutz = lazy(() => import('./pages/Datenschutz'))
const Posts = lazy(() => import('./pages/Posts'))
const Order = lazy(() => import('./pages/Order'))
const NotFound = lazy(() => import('./pages/NotFound'))

function ScrollToTop() {
  const [location] = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])
  return null
}

function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  )
}

function RouterContent() {
  return (
    <>
      <CssBaseline />
      <ScrollToTop />
      <PageMeta />
      <Navbar />
      <PageLayout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/about" component={About} />
            <Route path="/menu" component={Menu} />
            <Route path="/contact" component={Contact} />
            <Route path="/hours" component={Hours} />
            <Route path="/posts" component={Posts} />
            <Route path="/order" component={Order} />
            <Route path="/impressum" component={Impressum} />
            <Route path="/datenschutz" component={Datenschutz} />
            {/* Catch-all: renders for any unmatched path. Must stay last. */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </PageLayout>
      <Footer />
    </>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <I18nProvider>
        <RouterContent />
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
