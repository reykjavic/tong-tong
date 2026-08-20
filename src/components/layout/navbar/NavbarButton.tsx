import { Button } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../../../i18n'
import type { NavbarLink } from './shared'

interface NavbarButtonProps {
  link: NavbarLink
}

// Desktop nav-link button in the toolbar row (docs demo's page buttons).
// Keeps each pill on one line at any width — the toolbar cuts off instead of
// wrapping when space runs out.
export default function NavbarButton({ link }: NavbarButtonProps) {
  const { t } = useI18n()

  return (
    <Button
      component={Link}
      href={link.href}
      color="inherit"
      sx={{
        fontFamily: 'Libre Franklin, sans-serif',
        fontWeight: 600,
        textTransform: 'none',
        fontSize: '0.95rem',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
        '&[data-wouter-link-active]': {
          borderBottom: '2px solid white',
          fontWeight: 700,
        },
      }}
    >
      {t(link.key)}
    </Button>
  )
}
