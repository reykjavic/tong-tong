import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, useTheme, useMediaQuery } from '@mui/material'

export default function Impressum() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box>
      <Box sx={{
        py: { xs: 5, sm: 7 },
        textAlign: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      }}>
        <Container maxWidth="lg">
          <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ color: 'white', fontWeight: 700 }}>
            {t('impressum.title')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
        <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 }, bgcolor: theme.palette.background.paper }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: theme.palette.primary.main }}>
            {t('impressum.heading')}
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {t('impressum.name')}
          </Typography>

          <Box sx={{ '& > :not(:last-child)': { mb: 2 } }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              <strong>{t('impressum.representedBy')}</strong> {t('impressum.representatives')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              <strong>{t('impressum.address')}</strong> {t('impressum.street')}, {t('impressum.city')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              <strong>{t('impressum.phone')}</strong> {t('impressum.phoneNumber')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              <strong>{t('impressum.vatLabel')}</strong>
              <br />
              {t('impressum.vatNumber')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              <strong>{t('impressum.authorityLabel')}</strong> {t('impressum.authority')}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
