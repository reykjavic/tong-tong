import { useI18n } from '../i18n'
import { Box, Container, Typography, Paper, Button, useTheme, useMediaQuery } from '@mui/material'
import { Link } from 'wouter'

export default function Impressum() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ minHeight: '60vh', py: { xs: 4, sm: 6 } }}>
      <Container maxWidth="lg">
        <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
          {t('nav.impressum')}
        </Typography>
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 6 }, borderRadius: 3, mt: 3 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
            Impressum-Platzhalter. Hier stehen die rechtlichen Informationen gemäß deutschen Impressumspflicht-Gesetzen.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            China Restaurant Tong Tong<br />
            Schloßstraße 46<br />
            35683 Braunfels<br />
            Telefon: +49 (0) 6443 / 18 88
          </Typography>
          <Button variant="contained" component={Link} to="/">
            {t('common.backToHome')}
          </Button>
        </Paper>
      </Container>
    </Box>
  )
}