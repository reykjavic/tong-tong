import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import {
  AppBar, Avatar, Box, Container, Divider, IconButton, Menu, MenuItem, Toolbar,
  Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material'
import { Link, useLocation } from 'wouter'
import { useConfig } from '../../../hooks/config'
import { login, logout, useAuth } from '../../../hooks/auth'
import { useI18n } from '../../../i18n'
import Brand from './Brand'
import LanguageSelector, { FlagIcon, LANGUAGES } from './LanguageSelector'
import NavbarButton from './NavbarButton'
import type { NavbarLink } from './shared'

const links: NavbarLink[] = [
  { href: '/', key: 'nav.home' },
  { href: '/about', key: 'nav.about' },
  { href: '/menu', key: 'nav.menu' },
  { href: '/order', key: 'nav.order' },
  { href: '/contact', key: 'nav.contact' },
]

// Single responsive navbar following the MUI docs' "Responsive App Bar" demo —
// no separate web/mobile navbar anymore: one Toolbar adapts purely via CSS
// display rules. Desktop (md+): brand, page buttons, language, user menu.
// Mobile (below md): hamburger menu with the pages + language, then brand,
// then the user menu. The user menu shows the Google profile picture when
// signed in, an account icon otherwise.
export default function Navbar() {
  const { config } = useConfig()
  const [location] = useLocation()
  const theme = useTheme()
  const { t, setLanguage } = useI18n()
  const auth = useAuth()
  const isAuthed = auth.status !== 'anonymous'
  const visibleLinks = links.filter((link) => !(link.href === '/order' && !config.ordering.enabled))
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isHome = location === '/'
  const [scrolled, setScrolled] = useState(false)
  // Measured height of the AppBar, so the fixed navbar never covers content.
  const appBarRef = useRef<HTMLDivElement>(null)
  const [navbarHeight, setNavbarHeight] = useState(0)

  // Mobile nav menu + user settings menu (docs demo).
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null)
  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget)
  const handleCloseNavMenu = () => setAnchorElNav(null)
  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget)
  const handleCloseUserMenu = () => setAnchorElUser(null)

  const handleLogin = () => {
    handleCloseUserMenu()
    login()
  }
  const handleLogout = () => {
    handleCloseUserMenu()
    void logout()
  }
  const handleSelectLanguage = (code: 'de' | 'en') => {
    setLanguage(code)
    handleCloseNavMenu()
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const el = appBarRef.current
    if (!el) return
    const update = () => setNavbarHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile, isHome])

  // Fixed on mobile (always) and on home page (hero overlay). Static on
  // desktop non-home pages where the navbar sits naturally in the flow.
  const transparent = isHome && !scrolled
  const displayName = auth.name || auth.email

  return (
    <>
      {/* On mobile, the navbar is fixed and out of the document flow. On non-home
          pages there is no full-screen hero underneath, so reserve its measured
          height so content isn't hidden behind the solid bar. */}
      {isMobile && !isHome && <Box aria-hidden sx={{ height: navbarHeight }} />}
      <AppBar
        ref={appBarRef}
        component="nav"
        position={(isHome || isMobile) ? 'fixed' : 'static'}
        sx={{
          bgcolor: transparent ? 'transparent' : 'primary.main',
          boxShadow: transparent ? 'none' : undefined,
          transition: 'background-color 0.3s ease',
          // Clip the desktop navbar when the viewport is too narrow for its
          // full content — it cuts off at the right edge instead of wrapping
          // or bleeding (the navbar itself keeps its natural min width).
          overflow: 'hidden',
          // Give the fixed AppBar breathing room below the mobile status bar
          ...(isMobile && { pt: 'env(safe-area-inset-top, 8px)' }),
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Mobile only: hamburger opening the nav menu (pages + language).
                The menu itself is hidden from md up, like the docs demo.
                flexGrow mirrors the boilerplate: together with the brand's
                grow it balances the row so the brand centers on mobile. */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="Menü öffnen"
                aria-controls="menu-nav"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-nav"
                anchorEl={anchorElNav}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                keepMounted
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{ display: { xs: 'block', md: 'none' } }}
              >
                {visibleLinks.map((link) => (
                  <MenuItem key={link.href} component={Link} href={link.href} onClick={handleCloseNavMenu}>
                    <Typography sx={{ textAlign: 'center' }}>{t(link.key)}</Typography>
                  </MenuItem>
                ))}
                <Divider />
                <Typography variant="overline" sx={{ px: 2, fontWeight: 700 }}>
                  {t('common.language')}
                </Typography>
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} onClick={() => handleSelectLanguage(lang.code)} sx={{ gap: 1.5 }}>
                    <FlagIcon src={lang.flag} />
                    <Typography>{lang.name}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Brand — grows on mobile (hamburger left, user menu right),
                natural width on desktop so the page buttons sit right next to
                it, exactly like the demo's logo + pages. */}
            <Brand />

            {/* Desktop only: page buttons. flexGrow pushes language + user
                menu to the far right (docs demo). */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              {visibleLinks.map((link) => (
                <NavbarButton key={link.href} link={link} />
              ))}
            </Box>

            {/* Desktop only: language dropdown. Mobile has the language list
                inside the nav menu above. */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              <LanguageSelector />
            </Box>

            {/* User settings menu (docs demo): Google avatar when signed in,
                account icon when not. */}
            <Box sx={{ flexGrow: 0 }}>
              <IconButton
                size="large"
                aria-label="Benutzerkonto"
                aria-controls="menu-user"
                aria-haspopup="true"
                onClick={handleOpenUserMenu}
                color="inherit"
                sx={isAuthed ? { p: 0 } : undefined}
              >
                {isAuthed ? (
                  <Avatar alt={displayName ?? undefined} src={auth.picture ?? undefined} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
              <Menu
                id="menu-user"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
                sx={{ mt: '45px' }}
              >
                {isAuthed ? (
                  <>
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{displayName ?? '…'}</Typography>
                      {auth.email && (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {auth.email}
                        </Typography>
                      )}
                    </Box>
                    <Divider />
                    {auth.isAdmin && (
                      <MenuItem component={Link} href="/dashboard" onClick={handleCloseUserMenu}>
                        <Typography sx={{ textAlign: 'center' }}>{t('nav.admin')}</Typography>
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleLogout}>
                      <Typography sx={{ textAlign: 'center' }}>{t('nav.logout')}</Typography>
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem onClick={handleLogin}>
                    <Typography sx={{ textAlign: 'center' }}>{t('nav.login')}</Typography>
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  )
}
