import { ReactNode } from 'react'
import { Box, Container, Paper } from '@mui/material'

// Shared page shell: <main> > max-width container > transparent paper.
// Routes render their content inside this so every page gets the same
// outer gutter, background and min-height (footer stays at the bottom).
interface PageLayoutProps {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: 'calc(100vh - 64px)',
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 0 }}>
        <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
          {children}
        </Paper>
      </Container>
    </Box>
  )
}
