import { useEffect, useState, type MouseEvent } from 'react'
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
} from '@mui/material'
import { Check, ExpandMore } from '@mui/icons-material'
import { Link, useLocation } from 'wouter'
import { useI18n } from '../i18n'
import deFlag from '../assets/flags/de.svg'
import gbFlag from '../assets/flags/gb.svg'

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
  const isHome = location === '/'
  const [scrolled, setScrolled] = useState(false)
  const [langMenuAnchor, setLangMenuAnchor] = useState<HTMLElement | null>(null)
  const langMenuOpen = Boolean(langMenuAnchor)
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Transparent, floating navbar over the fullscreen hero on the home page;
  // becomes a solid bar once the user scrolls (or on any other page).
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
    <AppBar
      position={isHome ? 'fixed' : 'static'}
      sx={{
        bgcolor: transparent ? 'transparent' : 'primary.main',
        boxShadow: transparent ? 'none' : undefined,
        transition: 'background-color 0.3s ease',
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
                  fontWeight: 900,
                  fontSize: '1.3rem',
                  letterSpacing: '0.05em',
                  fontFamily: '"Open Sans", sans-serif',
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
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
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
    </AppBar>
  )
}