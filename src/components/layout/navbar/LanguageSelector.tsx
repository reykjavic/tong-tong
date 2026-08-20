import { memo, useState, type MouseEvent } from 'react'
import { Box, Button, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material'
import { Check, ExpandMore } from '@mui/icons-material'
import { useI18n } from '../../../i18n'
import { toolbarPillSx } from './shared'
import deFlag from '../../../assets/flags/de.svg'
import gbFlag from '../../../assets/flags/gb.svg'

// --- Language data + flag icon. The desktop dropdown below is their main
// consumer; the mobile nav menu in Navbar.tsx also imports them from here, so
// all language UI stays in this one file.

export interface LanguageOption {
  code: 'de' | 'en'
  label: string
  flag: string
  name: string
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'de', label: 'DE', flag: deFlag, name: 'Deutsch' },
  { code: 'en', label: 'EN', flag: gbFlag, name: 'English' },
]

interface FlagIconProps {
  src: string
  /** Border radius — slightly tighter inside menu rows. */
  radius?: number | string
}

// Small country flag rendered as a background image. Purely decorative, so it
// is hidden from assistive technology (the language label sits next to it).
// Its own memoized component so only it re-renders when the selector's state
// (e.g. the open menu) changes.
export const FlagIcon = memo(function FlagIcon({ src, radius = '4px' }: FlagIconProps) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 26,
        height: 18,
        flexShrink: 0,
        borderRadius: radius,
        backgroundImage: `url("${src}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
})

// Desktop language dropdown: trigger pill + menu. The mobile drawer renders
// its own full-width language list inside Navbar (using FlagIcon + LANGUAGES
// from this file).
export default function LanguageSelector() {
  const { language, setLanguage } = useI18n()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchor)
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)
  const closeMenu = () => setAnchor(null)
  const selectLanguage = (code: 'de' | 'en') => {
    setLanguage(code)
    setAnchor(null)
  }

  return (
    <>
      <Button
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Sprache wählen"
        sx={{ ...toolbarPillSx, px: 1, gap: 1.25 }}
      >
        <FlagIcon src={currentLang.flag} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {currentLang.label}
        </Typography>
        <ExpandMore sx={{ fontSize: 18, opacity: 0.9 }} />
      </Button>
      <Menu
        anchorEl={anchor}
        open={menuOpen}
        onClose={closeMenu}
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
                <FlagIcon src={lang.flag} radius="3px" />
              </ListItemIcon>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>
                {lang.name}
              </Typography>
              {isActive && <Check sx={{ ml: 'auto', color: 'primary.main', fontSize: 20 }} />}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
