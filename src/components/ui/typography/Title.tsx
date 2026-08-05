import { ReactNode } from 'react'
import { Typography, TypographyProps } from '@mui/material'

interface TitleProps {
  children: ReactNode
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  align?: TypographyProps['align']
  color?: string
}

// Section heading: brand accent color + semibold weight. Defaults to the deep
// teal primary; pass color="text.primary" for the rare non-accented heading
// (e.g. the restaurant name in the Impressum).
export default function Title({ children, variant = 'h4', align, color = 'primary.main' }: TitleProps) {
  return (
    <Typography variant={variant} align={align} sx={{ fontWeight: 700, color }}>
      {children}
    </Typography>
  )
}
