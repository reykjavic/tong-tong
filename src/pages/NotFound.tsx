import { Button, Container, Paper, Typography } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../i18n'
import VisuallyHiddenH1 from '../components/VisuallyHiddenH1'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, sm: 12 } }}>
      <VisuallyHiddenH1>{t('notFound.title')}</VisuallyHiddenH1>
      <Paper elevation={0} sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center', bgcolor: 'transparent' }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          {t('notFound.title')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
          {t('notFound.message')}
        </Typography>
        <Button variant="contained" component={Link} href="/" sx={{ bgcolor: 'primary.main', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }}>
          {t('common.backToHome')}
        </Button>
      </Paper>
    </Container>
  )
}
