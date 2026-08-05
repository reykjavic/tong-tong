import { useI18n } from '../i18n'
import { PAGE_VERTICAL_PADDING } from '../layout'
import VisuallyHiddenH1 from '../components/ui/VisuallyHiddenH1'
import { Box, Container, Paper, Button, Typography, useTheme, useMediaQuery } from '@mui/material'

const MENU_PDF_URL = '/tong-tong-2026.pdf'

export default function Menu() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Container maxWidth="lg" sx={{ py: PAGE_VERTICAL_PADDING }}>
      <VisuallyHiddenH1>{t('menu.title')}</VisuallyHiddenH1>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
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
    </Container>
  )
}
