import { ReactNode } from 'react'
import { Typography, TypographyProps } from '@mui/material'

interface BodyTextProps {
  children: ReactNode
  variant?: TypographyProps['variant']
  align?: TypographyProps['align']
}

// Standard body paragraph: muted secondary color, one consistent line height.
// Spacing between paragraphs belongs on the wrapping Stack, not on the text.
export default function BodyText({ children, variant = 'body1', align }: BodyTextProps) {
  return (
    <Typography variant={variant} align={align} sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
      {children}
    </Typography>
  )
}
