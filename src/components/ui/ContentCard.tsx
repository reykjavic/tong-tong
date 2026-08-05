import { ReactNode } from 'react'
import { Paper } from '@mui/material'

// Shared wrapper for static content pages (About, Impressum, Datenschutz).
// Was previously copy-pasted into every page; change the card styling here.
// bgcolor intentionally omitted: Paper already defaults to background.paper.
export default function ContentCard({ children }: { children: ReactNode }) {
  return (
    <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 } }}>
      {children}
    </Paper>
  )
}
