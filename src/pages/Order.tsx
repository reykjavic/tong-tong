import { useState } from 'react'
import { useI18n } from '../i18n'
import PageContainer from '../components/layout/PageContainer'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import { Link } from 'wouter'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { placeMockOrder } from '../hooks/orders'

// Placeholder for the online-ordering feature (in development on `dev`).
// Will be replaced by the real cart + checkout flow later. For now the page
// carries the mockup write button that proves the order pipeline
// (POST /orders -> DynamoDB -> kitchen read). The button 403s server-side
// while the ordering feature toggle is OFF.
export default function Order() {
  const { t } = useI18n()
  const [placing, setPlacing] = useState(false)
  const [placedId, setPlacedId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const handleAddMock = async () => {
    setPlacing(true)
    setPlacedId(null)
    setFailed(false)
    try {
      const { orderId } = await placeMockOrder()
      setPlacedId(orderId)
    } catch (err) {
      console.error('Mock order failed:', err)
      setFailed(true)
    } finally {
      setPlacing(false)
    }
  }

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
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              disabled={placing}
              onClick={() => void handleAddMock()}
              startIcon={placing ? <CircularProgress size={16} /> : undefined}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              {placing ? t('order.mockPlacing') : t('order.mockAdd')}
            </Button>
            <Button variant="outlined" component={Link} href="/menu" color="primary" sx={{ fontWeight: 600, textTransform: 'none' }}>
              {t('order.backToMenu')}
            </Button>
          </Box>
          {placedId && (
            <Box>
              <BodyText>{t('order.mockSuccess')}</BodyText>
              <Typography variant="body2" component="code" sx={{ color: 'text.secondary' }}>
                {placedId}
              </Typography>
            </Box>
          )}
          {failed && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {t('order.mockError')}
            </Typography>
          )}
        </Stack>
      </ContentCard>
    </PageContainer>
  )
}
