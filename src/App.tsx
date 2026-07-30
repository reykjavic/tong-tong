import { Switch, Route } from 'wouter'
import { CssBaseline, Box, Container, Paper } from '@mui/material'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import About from './pages/About'
import Menu from './pages/Menu'
import Contact from './pages/Contact'

function App() {
  return (
    <>
      <CssBaseline />
      <Navbar />
      <Box
        component="main"
        sx={{
          bgcolor: '#f5f5f5',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.default' }}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/about" component={About} />
              <Route path="/menu" component={Menu} />
              <Route path="/contact" component={Contact} />
            </Switch>
          </Paper>
        </Container>
      </Box>
    </>
  )
}

export default App