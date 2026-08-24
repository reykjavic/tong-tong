import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import {
  setConfig,
  setToggle,
  useConfig,
  useDeleteOrder,
  useHours,
  useOrdersQuery,
  useSetOrderStatus,
  type Order,
  type OrderStatus,
} from '../hooks/api'
import { login, logout, useAuth } from '../hooks/auth'
import { isEffectivelyOpen } from '../hooks/hours'
import { alpha } from '@mui/material/styles'
import PageContainer from '../components/layout/PageContainer'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

// The documented order lifecycle (SCOPE §6): Pending -> Notified -> Completed.
// The dropdown lets staff move an order either way as an override.
const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Notified', 'Completed']

function statusLabelKey(status: OrderStatus | null): string {
  switch (status) {
    case 'Pending':
      return 'dashboard.orders.statusPending'
    case 'Notified':
      return 'dashboard.orders.statusNotified'
    case 'Completed':
      return 'dashboard.orders.statusCompleted'
    default:
      return '—'
  }
}

// Colored dot per status — same semantics as the old status chip, but compact
// enough to live inside the dropdown rows.
function statusColor(status: OrderStatus | null): string {
  switch (status) {
    case 'Pending':
      return 'warning.main'
    case 'Notified':
      return 'info.main'
    case 'Completed':
      return 'success.main'
    default:
      return 'text.disabled'
  }
}

// Orders auto-refresh: poll only while the restaurant is actually open, per
// the real Google Business hours (src/hooks/hours.ts — business status,
// special/vacation days, the daily lunch/dinner windows). The 15s pattern
// applies only inside open hours: outside them (lunch/dinner gaps, Mondays,
// vacation weeks) no requests are made — polling has a pattern and a limit.
// TanStack Query drives it (src/hooks/api.ts): refetchInterval 15s while
// open, paused in background tabs by default, refetch-on-window-focus on
// return; the manual refresh button always works. The gate itself is
// re-evaluated every OPEN_STATUS_CHECK_MS because open/closed flips on a
// schedule (pure client-side arithmetic, no network).
const OPEN_STATUS_CHECK_MS = 60_000

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
  // Polling gate: poll only while the restaurant is actually open per the
  // Google hours (isEffectivelyOpen — business status, special/vacation days,
  // the daily lunch/dinner windows). "Polling has a pattern or a limit": the
  // 15s pattern applies only inside open hours. Re-evaluated every
  // OPEN_STATUS_CHECK_MS because the open/closed state flips on a schedule.
  const { hours } = useHours()
  const [isOpenNow, setIsOpenNow] = useState(() => isEffectivelyOpen(new Date(), hours).isOpen)

  // Orders = server state via TanStack Query: baseline load once authenticated,
  // 15s refetchInterval only while open, paused in background tabs, refetch on
  // window focus. The status/delete mutations invalidate the query so the list
  // follows (Completed orders drop out via the server's open-orders query).
  const ordersQuery = useOrdersQuery(auth.status === 'authenticated', isOpenNow)
  const statusMutation = useSetOrderStatus()
  const deleteMutation = useDeleteOrder()
  const orders = ordersQuery.data ?? null
  const ordersError = ordersQuery.isError
  const refreshingOrders = ordersQuery.isFetching
  const busy = statusMutation.isPending || deleteMutation.isPending

  // Per-row action state: which order is waiting on the delete confirmation,
  // whether the last status/delete action failed, and which orders arrived
  // since the last successful fetch (highlighted in the list).
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null)
  const [actionError, setActionError] = useState(false)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const seenOrderIdsRef = useRef<Set<string> | null>(null)

  const theme = useTheme()

  const current: FeatureValues = values ?? {
    ordering: config.ordering.enabled,
    reservations: config.reservations.enabled,
  }

  // New-order highlight: only runs when the query data reference actually
  // changed (TanStack structural sharing keeps the reference when the list is
  // identical, so this does not fire on unchanged polls). The first load
  // records the baseline without highlighting everything.
  useEffect(() => {
    const list = ordersQuery.data
    if (!list) return
    const seen = seenOrderIdsRef.current
    seenOrderIdsRef.current = new Set(list.map((o) => o.orderId))
    if (seen === null) {
      setNewOrderIds(new Set())
      return
    }
    const fresh = list.filter((o) => !seen.has(o.orderId)).map((o) => o.orderId)
    setNewOrderIds(fresh.length ? new Set(fresh) : new Set())
  }, [ordersQuery.data])

  // Keep the open/closed gate current. Purely client-side arithmetic from the
  // cached hours payload — no network. Hooks must stay above the early
  // returns, so the gate lives here on state rather than in the JSX below.
  useEffect(() => {
    const check = () => setIsOpenNow(isEffectivelyOpen(new Date(), hours).isOpen)
    check()
    const interval = setInterval(check, OPEN_STATUS_CHECK_MS)
    return () => clearInterval(interval)
  }, [hours])

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

  // Signed in with a non-admin Google account: no access. The server also
  // rejects /toggle and /staff for this session, so this is purely cosmetic.
  if (!auth.isAdmin) {
    return (
      <PageContainer title={t('dashboard.title')}>
        <ContentCard>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center', py: 6 }}>
            <Title variant="h4">{t('dashboard.title')}</Title>
            <Box sx={{ maxWidth: 460 }}>
              <BodyText>{t('dashboard.noAccess')}</BodyText>
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
      const data = await setToggle(feature, enabled)
      setValues({
        ordering: data.ordering.enabled,
        reservations: data.reservations.enabled,
      })
      // Publish the authoritative config into the query cache so already-mounted
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

  const handleRefreshOrders = () => {
    setActionError(false)
    void ordersQuery.refetch()
  }

  // Move an order through the lifecycle. Not optimistic: the row stays on the
  // old status until the PATCH resolves; the mutation invalidates the orders
  // query so the list follows (Completed orders drop out via the server's
  // open-orders query). On failure the Select reverts automatically — it is
  // controlled by order.status from the query.
  const handleStatusChange = (order: Order, status: OrderStatus) => {
    if (status === order.status || busy) return
    setActionError(false)
    statusMutation.mutate(
      { orderId: order.orderId, status },
      { onError: () => setActionError(true) },
    )
  }

  // Deletion is irreversible, so it always goes through the confirm dialog.
  const handleDelete = () => {
    if (!confirmDelete || busy) return
    const target = confirmDelete
    setConfirmDelete(null)
    setActionError(false)
    deleteMutation.mutate(target.orderId, { onError: () => setActionError(true) })
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

          {!isOpenNow && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('dashboard.orders.closedNote')}
            </Typography>
          )}
          {newOrderIds.size > 0 && (
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {newOrderIds.size}{' '}
              {t(newOrderIds.size === 1 ? 'dashboard.orders.newOrder' : 'dashboard.orders.newOrders')}
            </Typography>
          )}

          {actionError && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {t('dashboard.orders.actionError')}
            </Typography>
          )}

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
              {orders.map((order) => {
                const isNew = newOrderIds.has(order.orderId)
                return (
                <Box
                  key={order.orderId}
                  sx={{
                    border: 1,
                    borderColor: isNew ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    p: 1.5,
                    transition: 'background-color 0.6s ease, border-color 0.6s ease',
                    ...(isNew ? { bgcolor: alpha(theme.palette.primary.main, 0.06) } : {}),
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {order.orderId.slice(0, 8)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {formatTimestamp(order.createdAt)}
                      </Typography>
                      <Select
                        size="small"
                        value={order.status ?? 'Pending'}
                        disabled={busy}
                        onChange={(e) => void handleStatusChange(order, e.target.value as OrderStatus)}
                        inputProps={{ 'aria-label': t('dashboard.orders.statusLabel') }}
                        sx={{ minWidth: 150 }}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusColor(status) }} />
                              {t(statusLabelKey(status))}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      <Tooltip title={t('dashboard.orders.delete')}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={busy}
                            onClick={() => setConfirmDelete(order)}
                            aria-label={t('dashboard.orders.delete')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {(statusMutation.variables?.orderId === order.orderId ||
                        deleteMutation.variables === order.orderId) && <CircularProgress size={16} />}
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
                )
              })}
            </Stack>
          )}

          <Dialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
            <DialogTitle>{t('dashboard.orders.deleteConfirmTitle')}</DialogTitle>
            <DialogContent>
              <BodyText>
                {t('dashboard.orders.deleteConfirmText')}
                {confirmDelete && (
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {' '}({confirmDelete.orderId.slice(0, 8)})
                  </Box>
                )}
              </BodyText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setConfirmDelete(null)}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {t('dashboard.orders.deleteConfirmCancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => void handleDelete()}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {t('dashboard.orders.deleteConfirmOk')}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </ContentCard>
    </PageContainer>
  )
}
