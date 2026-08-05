import { Box, Link as MuiLink } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()

  return (
    <Box component="footer" sx={{ bgcolor: '#2B2D42', color: 'white', mt: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, py: 3, flexWrap: 'wrap' }}>
        <MuiLink component={Link} to="/impressum" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', '&:hover': { color: 'white' } }}>
          {t('nav.impressum')}
        </MuiLink>
        <MuiLink component={Link} to="/datenschutz" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', '&:hover': { color: 'white' } }}>
          {t('nav.datenschutz')}
        </MuiLink>
      </Box>
    </Box>
  )
}
