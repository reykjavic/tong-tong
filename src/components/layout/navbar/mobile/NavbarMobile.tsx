import { useState } from 'react'
import { Box, Divider, Drawer, IconButton, Typography } from '@mui/material'
import { Close as CloseIcon, Menu as MenuIcon } from '@mui/icons-material'
import { useI18n } from '../../../../i18n'
import { useAuth } from '../../../../hooks/auth'
import type { NavbarLink } from '../shared'
import { LANGUAGES } from '../LanguageSelector'
import LoggedInAs from '../LoggedInAs'
import LoginButton from '../LoginButton'
import DrawerLanguageRow from './DrawerLanguageRow'
import DrawerLink from './DrawerLink'

interface NavbarMobileProps {
  links: NavbarLink[]
}

// Mobile navbar: the hamburger button in the toolbar row plus the slide-in
// Drawer with all navigation (links, auth cluster, language list). Rendered by
// Navbar when the viewport is < sm. Owns its own open state — the drawer only
// exists on mobile, so nothing needs to be shared with NavbarWeb.
export default function NavbarMobile({ links }: NavbarMobileProps) {
  const { t } = useI18n()
  const auth = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAuthed = auth.status !== 'anonymous'
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 0.75 }}>
        <IconButton
          edge="end"
          aria-label="Menü öffnen"
          aria-haspopup="menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          color="inherit"
          sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
        >
          <MenuIcon />
        </IconButton>
      </Box>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(1px)',
            color: '#fff',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 1 }}>
            <Typography sx={{ fontWeight: 700, color: 'red', bgcolor: '#39FF14', px: 1.5, py: 0.5, borderRadius: 0.6, fontFamily: '"Kaushan Script", cursive', fontSize: '1.2rem' }}>
              Tong Tong
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Menü schließen" sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          {links.map((link) => (
            <DrawerLink key={link.href} link={link} onNavigate={closeDrawer} />
          ))}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {isAuthed && <LoggedInAs variant="drawer" onNavigate={closeDrawer} />}
            <LoginButton variant="drawer" onClick={closeDrawer} />
          </Box>
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant="overline" sx={{ px: 1, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
            {t('common.language')}
          </Typography>
          {LANGUAGES.map((lang) => (
            <DrawerLanguageRow key={lang.code} lang={lang} />
          ))}
        </Box>
      </Drawer>
    </>
  )
}
