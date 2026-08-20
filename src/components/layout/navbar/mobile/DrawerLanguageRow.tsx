import { Button, Typography } from '@mui/material'
import { Check } from '@mui/icons-material'
import { useI18n } from '../../../../i18n'
import { FlagIcon, type LanguageOption } from '../LanguageSelector'

interface DrawerLanguageRowProps {
  lang: LanguageOption
}

// Full-width language row inside the mobile drawer (flag + name + check for
// the active language). Uses the same language data as the desktop dropdown.
export default function DrawerLanguageRow({ lang }: DrawerLanguageRowProps) {
  const { language, setLanguage } = useI18n()
  const isActive = language === lang.code

  return (
    <Button
      onClick={() => setLanguage(lang.code)}
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
      <FlagIcon src={lang.flag} />
      <Typography sx={{ fontSize: '0.95rem', color: '#fff' }}>{lang.name}</Typography>
      {isActive && <Check sx={{ ml: 'auto', fontSize: 20, color: '#fff' }} />}
    </Button>
  )
}
