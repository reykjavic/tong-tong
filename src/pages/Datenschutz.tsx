import { useI18n } from '../i18n'
import { PAGE_VERTICAL_PADDING } from '../layout'
import { Box, Container, Paper, Typography, useTheme } from '@mui/material'

export default function Datenschutz() {
  const { t } = useI18n()
  const theme = useTheme()

  const sections = [
    { title: t('datenschutz.controller.title'), text: t('datenschutz.controller.text') },
    { title: t('datenschutz.hosting.title'), text: t('datenschutz.hosting.text') },
    { title: t('datenschutz.fonts.title'), text: t('datenschutz.fonts.text') },
    { title: t('datenschutz.localStorage.title'), text: t('datenschutz.localStorage.text') },
    { title: t('datenschutz.contact.title'), text: t('datenschutz.contact.text') },
    { title: t('datenschutz.rights.title'), text: t('datenschutz.rights.text') },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: PAGE_VERTICAL_PADDING }}>
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
  )
}
