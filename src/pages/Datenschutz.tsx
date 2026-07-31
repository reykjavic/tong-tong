import { useI18n } from '../i18n'
import { Box, Container, Typography, Paper, Button, useTheme, useMediaQuery } from '@mui/material'
import { Link } from 'wouter'

export default function Datenschutz() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ minHeight: '60vh', py: { xs: 4, sm: 6 } }}>
      <Container maxWidth="lg">
        <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
          {t('nav.datenschutz')}
        </Typography>
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 6 }, borderRadius: 3, mt: 3 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
            Datenschutz-Platzhalter. Hier steht die Datenschutzerklärung gemäß DSGVO und deutschen Datenschutzgesetzen.
          </Typography>
          <Button variant="contained" component={Link} to="/">
            {t('common.backToHome')}
          </Button>
        </Paper>
      </Container>
    </Box>
  )
}