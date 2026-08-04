import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#00695C',
      dark: '#004D40',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7B1F2B',
      dark: '#4A1018',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Libre Franklin", "Helvetica Neue", helvetica, arial, sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 500 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // overflow-x: clip (with hidden fallback for older browsers) kills any
        // horizontal scroll at the root, without making the document a scroll
        // container (which would break position: fixed descendants).
        html: {
          overflowX: 'clip',
          '@supports not (overflow: clip)': { overflowX: 'hidden' },
        },
        body: {
          overflowX: 'hidden',
          backgroundColor: '#FAFAFA',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        sx: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
  },
})

export default theme