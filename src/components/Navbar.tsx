import { useState, type MouseEvent } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material'
import { Check, ExpandMore } from '@mui/icons-material'
import { Link } from 'wouter'
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
  const [langMenuAnchor, setLangMenuAnchor] = useState<HTMLElement | null>(null)
  const langMenuOpen = Boolean(langMenuAnchor)
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

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
    <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
      <Toolbar>
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
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          {links.map((link) => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              color="inherit"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 500,
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
        {/* Language dropdown trigger */}
        <Button
          onClick={openLangMenu}
          aria-haspopup="menu"
          aria-expanded={langMenuOpen}
          aria-label="Sprache wählen"
          sx={{
            ml: 1,
            height: 34,
            px: 1,
            gap: 0.5,
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
              backgroundImage: `url(${currentLang.flag})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>
            {currentLang.label}
          </Typography>
          <ExpandMore sx={{ fontSize: 18, opacity: 0.9 }} />
        </Button>
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
                      backgroundImage: `url(${lang.flag})`,
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
      </Toolbar>
    </AppBar>
  )
}