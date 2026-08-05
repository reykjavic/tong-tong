import { ReactNode } from 'react'
import { Paper } from '@mui/material'

// Shared wrapper for static content pages (About, Impressum, Datenschutz).
// Was previously copy-pasted into every page; change the card styling here.
// bgcolor intentionally omitted: Paper already defaults to background.paper.
// Pass disablePadding for header-band cards: content bleeds to the card edges
// and corners are clipped (overflow hidden) — e.g. OpeningHours' colored header.
interface ContentCardProps {
  children: ReactNode
  disablePadding?: boolean
}
export default function ContentCard({ children, disablePadding = false }: ContentCardProps) {
  return (
    <Paper elevation={3} sx={{ borderRadius: 3, p: disablePadding ? 0 : { xs: 3, sm: 5 }, overflow: disablePadding ? 'hidden' : undefined }}>
      {children}
    </Paper>
  )
}
