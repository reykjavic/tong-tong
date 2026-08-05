import { Typography } from '@mui/material'
import type { ReactNode } from 'react'

// Screen-reader-only H1 so every page has exactly one, without visual noise.
export default function ScreenReaderPageTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="h1"
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '1px',
        height: '1px',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Typography>
  )
}
