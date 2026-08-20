import { Button } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../../../../i18n'
import type { NavbarLink } from '../shared'

interface NavbarButtonProps {
  link: NavbarLink
}

// Desktop nav-link pill. The mobile drawer has its own full-width rows
// (mobile/DrawerLink); this one is a compact pill for the horizontal toolbar
// row. Extracted from Navbar.tsx — `Link` and `t` belong inside the component
// (import + hook), so the only prop is `link`.
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
