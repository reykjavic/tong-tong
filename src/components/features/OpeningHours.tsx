import { useI18n } from '../../i18n'
import { Box, Typography, Chip, Divider, useTheme } from '@mui/material'
import { AccessTime } from '@mui/icons-material'
import { Fragment, useState, useEffect } from 'react'
import {
  isEffectivelyOpen,
  useHours,
  weekRowsFromDefaultSchedule,
  weekRowsFromRegularHours,
  type WeekRow,
} from '../../hooks/hours'
import ContentCard from '../ui/ContentCard'

// Opening-hours section (homepage + /hours). Google Business Profile is the
// single source of truth: the weekly table renders straight from
// regularOpeningHours (via useHours), and the live chip from the
// special/vacation-adjusted currentOpeningHours + businessStatus. The
// hardcoded schedule only shows while /hours has no data (fail-open).
export default function OpeningHours() {
  const { t } = useI18n()
  const theme = useTheme()
  const { hours } = useHours()
  // Live status: real Google hours when available, otherwise the default
  // schedule. Re-evaluated every minute — the daily open/closed flips (lunch
  // ends, dinner starts) come from this client-side re-check, not new fetches.
  const [status, setStatus] = useState(() => isEffectivelyOpen(new Date(), hours))

  useEffect(() => {
    const checkStatus = () => setStatus(isEffectivelyOpen(new Date(), hours))
    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [hours])

  const week: WeekRow[] = hours?.regularHours
    ? weekRowsFromRegularHours(hours.regularHours)
    : weekRowsFromDefaultSchedule()

  const chipLabel =
    status.reason === 'closedSpecial'
      ? t('home.hours.closedSpecial')
      : status.reason === 'closedTemporarily'
        ? t('home.hours.closedTemporarily')
        : status.isOpen
          ? t('home.hours.open')
          : t('home.hours.closed')

  const dayLabels = [
    t('home.hours.monday'),
    t('home.hours.tuesday'),
    t('home.hours.wednesday'),
    t('home.hours.thursday'),
    t('home.hours.friday'),
    t('home.hours.saturday'),
    t('home.hours.sunday'),
  ]

  const fmtWindow = (w: { start: string; end: string }) => `${w.start} – ${w.end}`

  return (
    <ContentCard disablePadding>
      <Box sx={{
        bgcolor: theme.palette.primary.main,
        p: { xs: 3, sm: 4 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccessTime sx={{ fontSize: 32, color: 'white' }} />
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            {t('home.hours.title')}
          </Typography>
        </Box>
        <Chip
          label={chipLabel}
          sx={{
            bgcolor: status.isOpen ? '#4CAF50' : '#F44336',
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem',
            px: 2,
          }}
        />
      </Box>
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {week.map((row, i) => (
            <Fragment key={i}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                py: 1.5,
              }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {dayLabels[i]}
                </Typography>
                {row.windows.length > 0 ? (
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    {row.windows.map(fmtWindow).join(', ')}
                  </Typography>
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.disabled' }}>
                    {t('home.hours.closed')}
                  </Typography>
                )}
              </Box>
              {i < week.length - 1 && <Divider />}
            </Fragment>
          ))}
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          {t('home.hours.reservation')}
        </Typography>
      </Box>
    </ContentCard>
  )
}
