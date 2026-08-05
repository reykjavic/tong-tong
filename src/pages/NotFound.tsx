import { Button, Stack } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../i18n'
import ScreenReaderPageTitle from '../components/ui/ScreenReaderPageTitle'
import { Title, BodyText } from '../components/ui/typography'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: { xs: 8, sm: 12 }, maxWidth: 'sm', mx: 'auto' }}>
      <ScreenReaderPageTitle>{t('notFound.title')}</ScreenReaderPageTitle>
      <Title variant="h2" align="center">
        404
      </Title>
      <Title variant="h5" align="center" color="text.primary">
        {t('notFound.title')}
      </Title>
      <BodyText align="center">{t('notFound.message')}</BodyText>
      <Button
        variant="contained"
        component={Link}
        href="/"
        sx={{ fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }}
      >
        {t('common.backToHome')}
      </Button>
    </Stack>
  )
}
