import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  IconButton,
  Drawer,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Check, ExpandMore, Close as CloseIcon, Menu as MenuIcon } from '@mui/icons-material'
import { Link, useLocation } from 'wouter'
import { useI18n } from '../../i18n'
import deFlag from '../../assets/flags/de.svg'
import gbFlag from '../../assets/flags/gb.svg'

const links = [
  { href: '/', key: 'nav.home' },
  { href: '/about', key: 'nav.about' },
  { href: '/menu', key: 'nav.menu' },
  { href: '/contact', key: 'nav.contact' },
]

const LANGUAGES = [
  { code: 'de', label: 'DE', flag: deFlag, name: 'Deutsch' },
  { code: 'en', label: 'EN', flag: gbFlag, name: 'English' },
] as const

export default function Navbar() {
  const { language, t, setLanguage } = useI18n()
  const [location] = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isHome = location === '/'
  const [scrolled, setScrolled] = useState(false)
  const [langMenuAnchor, setLangMenuAnchor] = useState<HTMLElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const langMenuOpen = Boolean(langMenuAnchor)
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]
  // Measured height of the AppBar, so the fixed navbar never covers content.
  const appBarRef = useRef<HTMLDivElement>(null)
  const [navbarHeight, setNavbarHeight] = useState(0)

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

  const openLangMenu = (event: MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget)
  }
  const closeLangMenu = () => {
    setLangMenuAnchor(null)
  }
  const selectLanguage = (code: 'de' | 'en') => {
    setLanguage(code)
    setLangMenuAnchor(null)
  }

  return (
    <>
      {/* On mobile, the navbar is fixed and out of the document flow. On non-home
          pages there is no full-screen hero underneath, so reserve its measured
          height so content isn't hidden behind the solid bar. */}
      {isMobile && !isHome && <Box aria-hidden sx={{ height: navbarHeight }} />}
      <AppBar
        ref={appBarRef}
        position={(isHome || isMobile) ? 'fixed' : 'static'}
        sx={{
          bgcolor: transparent ? 'transparent' : 'primary.main',
          boxShadow: transparent ? 'none' : undefined,
          transition: 'background-color 0.3s ease',
          // Give the fixed AppBar breathing room below the mobile status bar
          ...(isMobile && { pt: 'env(safe-area-inset-top, 8px)' }),
        }}
      >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
            <Box
              component={Link}
              href="/"
              aria-label="Tong Tong – Startseite"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                borderRadius: 0.4,
                bgcolor: '#39FF14',
                px: 2.5,
                py: 1.3,
                gap: 1,
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <Typography
                sx={{
                  color: 'red',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  letterSpacing: '0.02em',
                  fontFamily: '"Kaushan Script", cursive',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Tong Tong
              </Typography>
              <Typography
                sx={{
                  color: 'red',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                冬冬饭店
              </Typography>
            </Box>
          </Box>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {links.map((link) => (
                <Button
                  key={link.href}
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
              ))}
            </Box>
          )}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {isMobile ? (
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
            ) : (
              <>
                {/* Language dropdown trigger */}
                <Button
                  onClick={openLangMenu}
                  aria-haspopup="menu"
                  aria-expanded={langMenuOpen}
                  aria-label="Sprache wählen"
                  sx={{
                    height: 34,
                    px: 1,
                    gap: 1.25,
                    borderRadius: '8px',
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 18,
                      borderRadius: '4px',
                      backgroundImage: `url("${currentLang.flag}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>
                    {currentLang.label}
                  </Typography>
                  <ExpandMore sx={{ fontSize: 18, opacity: 0.9 }} />
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
      <Menu
          anchorEl={langMenuAnchor}
          open={langMenuOpen}
          onClose={closeLangMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: 2,
              minWidth: 190,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            },
          }}
        >
          {LANGUAGES.map((lang) => {
            const isActive = language === lang.code
            return (
              <MenuItem
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                selected={isActive}
                sx={{ gap: 1.5, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 26,
                      height: 18,
                      borderRadius: '3px',
                      backgroundImage: `url("${lang.flag}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </ListItemIcon>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: isActive ? 700 : 500 }}>
                  {lang.name}
                </Typography>
                {isActive && <Check sx={{ ml: 'auto', color: 'primary.main', fontSize: 20 }} />}
              </MenuItem>
            )
          })}
        </Menu>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Menü schließen" sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          {links.map((link) => {
            const isMenuLink = link.href === '/menu'
            return (
              <Button
                key={link.href}
                component={isMenuLink ? 'a' : Link}
                {...(isMenuLink
                  ? { href: '/tong-tong-2026.pdf' }
                  : { href: link.href }
                )}
                onClick={() => setDrawerOpen(false)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 1.2,
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
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
          })}
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant="overline" sx={{ px: 1, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
            {t('common.language')}
          </Typography>
          {LANGUAGES.map((lang) => {
            const isActive = language === lang.code
            return (
              <Button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 1,
                  gap: 1.5,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: isActive ? 700 : 500,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 18,
                    borderRadius: '4px',
                    backgroundImage: `url("${lang.flag}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <Typography sx={{ fontSize: '0.95rem', color: '#fff' }}>{lang.name}</Typography>
                {isActive && <Check sx={{ ml: 'auto', fontSize: 20, color: '#fff' }} />}
              </Button>
            )
          })}
        </Box>
      </Drawer>
      </AppBar>
    </>
  )
}