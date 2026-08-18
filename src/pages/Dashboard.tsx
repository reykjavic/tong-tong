import { useState } from 'react'
import { useI18n } from '../i18n'
import { setConfig, useConfig, type SiteConfig } from '../hooks/config'
import { apiFetch, login, logout, useAuth } from '../hooks/auth'
import PageContainer from '../components/layout/PageContainer'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'

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

  const current: FeatureValues = values ?? {
    ordering: config.ordering.enabled,
    reservations: config.reservations.enabled,
  }

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
        </Box>
      </ContentCard>
    </PageContainer>
  )
}
