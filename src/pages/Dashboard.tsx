import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { setConfig, useConfig, type SiteConfig } from '../hooks/config'
import { apiFetch, login, logout, useAuth } from '../hooks/auth'
import { fetchOrders, type Order } from '../hooks/orders'
import PageContainer from '../components/layout/PageContainer'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material'

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

type FeatureKey = 'ordering' | 'reservations'
type FeatureValues = Record<FeatureKey, boolean>

// Admin panel — Google-login protected. Shows the feature toggles; every flip
// writes through POST /toggle (auth Lambda mints the session, toggle Lambda
// re-checks ADMIN_EMAIL). Only the configured admin email ever renders this.
export default function Dashboard() {
  const { t } = useI18n()
  const auth = useAuth()
  const { status: configStatus, config } = useConfig()

  // Local switch state, initialized from the public config once it loads; used
  // as the optimistic source while a toggle request is in flight.
  const [values, setValues] = useState<FeatureValues | null>(null)
  const [saving, setSaving] = useState<FeatureKey | null>(null)
  const [error, setError] = useState(false)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [ordersError, setOrdersError] = useState(false)
  const [refreshingOrders, setRefreshingOrders] = useState(false)

  const current: FeatureValues = values ?? {
    ordering: config.ordering.enabled,
    reservations: config.reservations.enabled,
  }

  // Load open orders once the Google session is confirmed. Hooks must stay
  // above the early returns, so the gate lives on auth.status here rather than
  // in the JSX below.
  useEffect(() => {
    if (auth.status !== 'authenticated') return
    let cancelled = false
    fetchOrders()
      .then((list) => {
        if (cancelled) return
        setOrders(list)
        setOrdersError(false)
      })
      .catch((err) => {
        console.error('Failed to load orders:', err)
        if (!cancelled) setOrdersError(true)
      })
    return () => {
      cancelled = true
    }
  }, [auth.status])

  if (auth.status === 'loading') {
    return (
      <PageContainer title={t('dashboard.title')}>
        <ContentCard>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </ContentCard>
      </PageContainer>
    )
  }

  if (auth.status === 'anonymous') {
    return (
      <PageContainer title={t('dashboard.title')}>
        <ContentCard>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center', py: 6 }}>
            <Title variant="h4">{t('dashboard.title')}</Title>
            <Box sx={{ maxWidth: 460 }}>
              <BodyText>{t('dashboard.loginPrompt')}</BodyText>
            </Box>
            <Box sx={{ pt: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => login('/dashboard')}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {t('dashboard.loginButton')}
              </Button>
            </Box>
          </Box>
        </ContentCard>
      </PageContainer>
    )
  }

  const handleToggle = async (feature: FeatureKey, enabled: boolean) => {
    const previous = current
    setValues({ ...previous, [feature]: enabled })
    setSaving(feature)
    setError(false)
    try {
      const res = await apiFetch('/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled }),
      })
      if (!res.ok) throw new Error(`toggle failed: ${res.status}`)
      const data = (await res.json()) as SiteConfig
      setValues({
        ordering: data.ordering.enabled,
        reservations: data.reservations.enabled,
      })
      // Publish the authoritative config to the shared store so already-mounted
      // consumers (Navbar, Menu) reflect the flip on the current route — no reload.
      setConfig(data)
    } catch (err) {
      console.error('Toggle save failed:', err)
      setValues(previous) // revert the optimistic flip
      setError(true)
    } finally {
      setSaving(null)
    }
  }

  const handleRefreshOrders = async () => {
    setRefreshingOrders(true)
    setOrdersError(false)
    try {
      setOrders(await fetchOrders())
    } catch (err) {
      console.error('Failed to refresh orders:', err)
      setOrdersError(true)
    } finally {
      setRefreshingOrders(false)
    }
  }

  const featureSwitch = (feature: FeatureKey, labelKey: string, descKey: string) => (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={current[feature]}
            disabled={saving !== null}
            onChange={(e) => handleToggle(feature, e.target.checked)}
          />
        }
        label={<Typography sx={{ fontWeight: 600 }}>{t(labelKey)}</Typography>}
      />
      <Box sx={{ ml: 4, mt: -0.5 }}>
        <BodyText>{t(descKey)}</BodyText>
      </Box>
    </Box>
  )

  return (
    <PageContainer title={t('dashboard.title')}>
      <ContentCard>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Title variant="h5">{t('dashboard.title')}</Title>
              <Box sx={{ color: 'text.secondary' }}>
                <BodyText>
                  {t('dashboard.signedInAs')} <strong>{auth.email}</strong>
                </BodyText>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => void logout()}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              {t('dashboard.logout')}
            </Button>
          </Box>

          <Divider />

          {configStatus === 'loading' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {featureSwitch('ordering', 'dashboard.ordering', 'dashboard.orderingDescription')}
              {featureSwitch('reservations', 'dashboard.reservations', 'dashboard.reservationsDescription')}
              {error && (
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  {t('dashboard.saveError')}
                </Typography>
              )}
            </Box>
          )}

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Title variant="h6">{t('dashboard.orders.title')}</Title>
            <Button
              size="small"
              variant="outlined"
              disabled={refreshingOrders}
              onClick={() => void handleRefreshOrders()}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              {refreshingOrders ? t('dashboard.orders.refreshing') : t('dashboard.orders.refresh')}
            </Button>
          </Box>

          {ordersError ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                {t('dashboard.orders.error')}
              </Typography>
              <Button size="small" color="primary" onClick={() => void handleRefreshOrders()} sx={{ fontWeight: 600, textTransform: 'none' }}>
                {t('dashboard.orders.retry')}
              </Button>
            </Box>
          ) : orders === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : orders.length === 0 ? (
            <BodyText>{t('dashboard.orders.empty')}</BodyText>
          ) : (
            <Stack spacing={1.5}>
              {orders.map((order) => (
                <Box key={order.orderId} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {order.orderId.slice(0, 8)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {formatTimestamp(order.createdAt)}
                      </Typography>
                      <Chip
                        size="small"
                        label={order.status ?? '—'}
                        color={order.status === 'Pending' ? 'warning' : order.status === 'Notified' ? 'info' : 'default'}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 0.5 }}>
                    {order.items.map((item, i) => (
                      <Typography key={i} variant="body2">
                        {item.name} × {item.qty}
                      </Typography>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {order.channel}: {order.contact}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {order.total.toFixed(2)} €
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </ContentCard>
    </PageContainer>
  )
}
