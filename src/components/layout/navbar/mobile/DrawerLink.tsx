import { Button } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../../../../i18n'
import { drawerRowSx, type NavbarLink } from '../shared'

interface DrawerLinkProps {
  link: NavbarLink
  /** Closes the drawer after navigating. */
  onNavigate: () => void
}

// Full-width nav row inside the mobile drawer. The /menu entry links straight
// to the PDF file (plain anchor, no SPA route); every other link uses wouter.
export default function DrawerLink({ link, onNavigate }: DrawerLinkProps) {
  const { t } = useI18n()
  const isMenuLink = link.href === '/menu'

  return (
    <Button
      component={isMenuLink ? 'a' : Link}
      {...(isMenuLink ? { href: '/tong-tong-2026.pdf' } : { href: link.href })}
      onClick={onNavigate}
      sx={{
        ...drawerRowSx,
        '&[data-wouter-link-active]': {
          color: '#fff',
          fontWeight: 700,
          bgcolor: 'rgba(255,255,255,0.18)',
        },
      }}
    >
      {t(link.key)}
    </Button>
  )
}
