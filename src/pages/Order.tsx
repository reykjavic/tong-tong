import { useI18n } from '../i18n'
import PageContainer from '../components/layout/PageContainer'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import { Link } from 'wouter'
import { Box, Button, Stack, Typography } from '@mui/material'

// Placeholder for the online-ordering feature (in development on `dev`).
// Will be replaced by the real cart + checkout flow later.
export default function Order() {
  const { t } = useI18n()

  return (
    <PageContainer title={t('order.title')}>
      <ContentCard>
        <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h1" sx={{ fontSize: '3rem', lineHeight: 1 }}>
            🥡
          </Typography>
          <Title variant="h4">{t('order.comingSoon')}</Title>
          <Box sx={{ maxWidth: 520 }}>
            <BodyText>{t('order.message')}</BodyText>
          </Box>
          <Box sx={{ pt: 1 }}>
            <Button variant="outlined" component={Link} href="/menu" color="primary" sx={{ fontWeight: 600, textTransform: 'none' }}>
              {t('order.backToMenu')}
            </Button>
          </Box>
        </Stack>
      </ContentCard>
    </PageContainer>
  )
}
