import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, useTheme, useMediaQuery } from '@mui/material'

export default function Datenschutz() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const sections = [
    { title: t('datenschutz.controller.title'), text: t('datenschutz.controller.text') },
    { title: t('datenschutz.hosting.title'), text: t('datenschutz.hosting.text') },
    { title: t('datenschutz.fonts.title'), text: t('datenschutz.fonts.text') },
    { title: t('datenschutz.localStorage.title'), text: t('datenschutz.localStorage.text') },
    { title: t('datenschutz.contact.title'), text: t('datenschutz.contact.text') },
    { title: t('datenschutz.rights.title'), text: t('datenschutz.rights.text') },
  ]

  return (
    <Box>
      <Box sx={{
        py: { xs: 5, sm: 7 },
        textAlign: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      }}>
        <Container maxWidth="lg">
          <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ color: 'white', fontWeight: 700 }}>
            {t('datenschutz.title')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
        <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 }, bgcolor: theme.palette.background.paper }}>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 3 }}>
            {t('datenschutz.intro')}
          </Typography>
          {sections.map((s, i) => (
            <Box key={i} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
                {s.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                {s.text}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Container>
    </Box>
  )
}
