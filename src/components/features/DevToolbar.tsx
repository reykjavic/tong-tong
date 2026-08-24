import { useState } from 'react'
import { useLocation } from 'wouter'
import { useI18n } from '../../i18n'
import { setDevAuthState, useAuth, type AuthState } from '../../hooks/auth'
import { setDevPinnedConfig, useConfig, type SiteConfig } from '../../hooks/api'
import { Close as CloseIcon } from '@mui/icons-material'
import { Box, Fab, IconButton, Paper, Stack, ToggleButton, Typography } from '@mui/material'

// Dev-only simulation toolbar. Mounted by the app shell in dev builds (App.tsx
// gates it on import.meta.env.DEV) AND rendered by the component playground
// (src/playground) — the playground seeds the simulated states below at module
// load, the main app starts from the live anonymous/default state.
//
// The toolbar is a pure controller over the dev-only seams in src/hooks
// (setDevAuthState / setDevPinnedConfig, both no-ops outside dev builds): the
// selected toggles are DERIVED from the live stores (useAuth / useConfig), so
// whatever is actually applied is always what the toolbar shows, and clicks
// only ever push new values into those stores. No forced initial state here —
// callers that want one (the playground) seed it themselves.
//
// The page buttons navigate through wouter's useLocation(), which works with
// both the real browser router and the playground's in-memory router.

export type DevAuthKey = 'anonymous' | 'loading' | 'user' | 'admin'

// Exported so the playground can seed its preview state (it historically opens
// with a logged-in non-admin user + ordering enabled).
export const AUTH_STATES: Record<DevAuthKey, AuthState> = {
  anonymous: { status: 'anonymous', email: null, name: null, picture: null, isAdmin: false },
  loading: { status: 'loading', email: null, name: null, picture: null, isAdmin: false },
  user: {
    status: 'authenticated',
    email: 'gast@example.com',
    name: 'Max Mustermann',
    picture: null,
    isAdmin: false,
  },
  admin: {
    status: 'authenticated',
    email: 'admin@tong-tong.eu',
    name: 'Thomas Mohr',
    picture: null,
    isAdmin: true,
  },
}

export const ORDERING_CONFIG: Record<'on' | 'off', SiteConfig> = {
  on: { ordering: { enabled: true }, reservations: { enabled: false } },
  off: { ordering: { enabled: false }, reservations: { enabled: false } },
}

const AUTH_LABEL_KEYS: Record<DevAuthKey, string> = {
  anonymous: 'dev.auth.anonymous',
  loading: 'dev.auth.loading',
  user: 'dev.auth.user',
  admin: 'dev.auth.admin',
}

export default function DevToolbar() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const auth = useAuth()
  const { config } = useConfig()
  const [location, navigate] = useLocation()

  // Hooks must stay unconditional, so the DEV gate is checked after them.
  if (!import.meta.env.DEV) return null

  const authKey: DevAuthKey =
    auth.status === 'loading'
      ? 'loading'
      : auth.status === 'anonymous'
        ? 'anonymous'
        : auth.isAdmin
          ? 'admin'
          : 'user'
  const ordering: 'on' | 'off' = config.ordering.enabled ? 'on' : 'off'

  const selectAuth = (key: DevAuthKey) => setDevAuthState(AUTH_STATES[key])
  const selectOrdering = (key: 'on' | 'off') => setDevPinnedConfig(ORDERING_CONFIG[key])

  // Jumping to the admin page also switches to the admin login state so the
  // Dashboard renders its real content immediately (same as the playground).
  const goToDashboard = () => {
    selectAuth('admin')
    navigate('/dashboard')
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }}>
      {open ? (
        <Paper elevation={8} sx={{ p: 1.5, width: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              {t('dev.title')}
            </Typography>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label={t('dev.collapse')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                {t('dev.authSection')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(Object.keys(AUTH_LABEL_KEYS) as DevAuthKey[]).map((key) => (
                  <ToggleButton
                    key={key}
                    value={key}
                    size="small"
                    selected={authKey === key}
                    onClick={() => selectAuth(key)}
                    sx={{ borderRadius: '6px', px: 1 }}
                  >
                    {t(AUTH_LABEL_KEYS[key])}
                  </ToggleButton>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                {t('dev.orderingSection')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ToggleButton
                  size="small"
                  selected={ordering === 'on'}
                  value="on"
                  onClick={() => selectOrdering('on')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  {t('dev.ordering.on')}
                </ToggleButton>
                <ToggleButton
                  size="small"
                  selected={ordering === 'off'}
                  value="off"
                  onClick={() => selectOrdering('off')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  {t('dev.ordering.off')}
                </ToggleButton>
              </Box>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                {t('dev.pagesSection')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <ToggleButton
                  size="small"
                  value="/"
                  selected={location === '/'}
                  onClick={() => navigate('/')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  {t('dev.pages.home')}
                </ToggleButton>
                <ToggleButton
                  size="small"
                  value="/order"
                  selected={location === '/order'}
                  onClick={() => navigate('/order')}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  {t('dev.pages.order')}
                </ToggleButton>
                <ToggleButton
                  size="small"
                  value="/dashboard"
                  selected={location === '/dashboard'}
                  onClick={goToDashboard}
                  sx={{ borderRadius: '6px', px: 1 }}
                >
                  {t('dev.pages.dashboard')}
                </ToggleButton>
              </Box>
            </Box>
          </Stack>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            {t('dev.caption')}
          </Typography>
        </Paper>
      ) : (
        <Fab size="small" color="primary" onClick={() => setOpen(true)} aria-label={t('dev.expand')}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700 }}>{t('dev.badge')}</Typography>
        </Fab>
      )}
    </Box>
  )
}
