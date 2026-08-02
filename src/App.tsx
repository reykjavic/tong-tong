import { Switch, Route } from 'wouter'
import { CssBaseline, Box, Container, Paper, ThemeProvider } from '@mui/material'
import theme from './theme'
import { I18nProvider } from './i18n'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/HomePage'
import About from './pages/About'
import Menu from './pages/Menu'
import Contact from './pages/Contact'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import Posts from './pages/Posts'

function RouterContent() {
  return (
    <>
      <CssBaseline />
      <Navbar />
      <Box
        component="main"
        sx={{
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.default' }}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/about" component={About} />
              <Route path="/menu" component={Menu} />
              <Route path="/contact" component={Contact} />
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