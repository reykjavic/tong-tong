import { useEffect } from 'react'
import { Switch, Route, useLocation } from 'wouter'
import { CssBaseline, Box, Container, Paper, ThemeProvider } from '@mui/material'
import theme from './theme'
import { I18nProvider } from './i18n'
import Navbar from './components/Navbar'
import PageMeta from './components/PageMeta'
import Footer from './components/Footer'
import Home from './pages/HomePage'
import About from './pages/About'
import Menu from './pages/Menu'
import Contact from './pages/Contact'
import Hours from './pages/Hours'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import Posts from './pages/Posts'

function ScrollToTop() {
  const [location] = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])
  return null
}

function RouterContent() {
  return (
    <>
      <CssBaseline />
      <ScrollToTop />
      <PageMeta />
      <Navbar />
      <Box
        component="main"
        sx={{
          minHeight: 'calc(100vh - 64px)',
          overflowX: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 0 }}>
          <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/about" component={About} />
              <Route path="/menu" component={Menu} />
              <Route path="/contact" component={Contact} />
              <Route path="/hours" component={Hours} />
              <Route path="/posts" component={Posts} />
              <Route path="/impressum" component={Impressum} />
              <Route path="/datenschutz" component={Datenschutz} />
              <Route path="/" component={Home} />
            </Switch>
          </Paper>
        </Container>
      </Box>
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