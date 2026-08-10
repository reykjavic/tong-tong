import { useI18n } from '../i18n'
import PageContainer from '../components/layout/PageContainer'
import { Link } from 'wouter'
import { Box, Paper, Button, Typography, useTheme, useMediaQuery } from '@mui/material'

const MENU_PDF_URL = '/tong-tong-2026.pdf'

export default function Menu() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <PageContainer title={t('menu.title')}>
      <Box sx={{ textAlign: 'center', mb: 3, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            component={Link}
            href="/order"
            fullWidth={isMobile}
            sx={{
              bgcolor: theme.palette.secondary.main, fontWeight: 700, px: 4, py: 1.2,
              '&:hover': { bgcolor: theme.palette.secondary.dark },
            }}
          >
            {t('menu.orderButton')}
          </Button>
          <Button
            variant="contained"
            component="a"
            href={MENU_PDF_URL}
            {...(!isMobile && { target: '_blank', rel: 'noopener noreferrer' })}
            fullWidth={isMobile}
            sx={{
              bgcolor: theme.palette.primary.main, fontWeight: 600, px: 4, py: 1.2,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            {t('menu.openInNewTab')}
          </Button>
        </Box>
        {isMobile ? (
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
            {t('menu.mobileHint')}
          </Typography>
        ) : (
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: theme.palette.background.paper }}>
            <Box
              component="iframe"
              src={MENU_PDF_URL}
              title={t('menu.pdfTitle')}
              sx={{ width: '100%', height: 800, border: 'none', display: 'block' }}
            />
          </Paper>
        )}
    </PageContainer>
  )
}
