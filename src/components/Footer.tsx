import { useI18n } from '../i18n'
import { Box, Container, Typography, Link as MuiLink, Divider, Grid } from '@mui/material'
import { Link } from 'wouter'

export default function Footer() {
  const { t } = useI18n()

  return (
    <Box component="footer" sx={{ bgcolor: '#2B2D42', color: 'white', mt: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3} justifyContent="space-between">
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              China Restaurant Tong Tong
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Frische chinesische Gerichte im Herzen von Braunfels.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Öffnungszeiten
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Di-Sa: 11:30-14:00 & 17:30-21:30
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              So: 17:30-21:00
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Kontakt
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Schloßstraße 46, 35683 Braunfels
            </Typography>
            <MuiLink href="tel:+4964431888" component="a" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', display: 'block', mt: 0.5 }}>
              +49 (0) 6443 / 18 88
            </MuiLink>
          </Grid>
        </Grid>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <MuiLink component={Link} to="/impressum" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', '&:hover': { color: 'white' } }}>
            {t('nav.impressum')}
          </MuiLink>
          <MuiLink component={Link} to="/datenschutz" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', '&:hover': { color: 'white' } }}>
            {t('nav.datenschutz')}
          </MuiLink>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            {t('common.footer')}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}