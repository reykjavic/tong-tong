import { useI18n } from '../../i18n'
import { Box, Typography, Chip, useTheme, useMediaQuery, Divider } from '@mui/material'
import { AccessTime, Star } from '@mui/icons-material'
import { Fragment, useState, useEffect } from 'react'
import {
  buildOpeningRows,
  isEffectivelyOpen,
  useHours,
  weekRowsFromDefaultSchedule,
  weekRowsFromRegularHours,
  type OpeningRow,
  type WeekRow,
} from '../../hooks/hours'
import ContentCard from '../ui/ContentCard'

// ---- Table rendering. The data->rows mapping lives in buildOpeningRows
// (src/hooks/hours.ts): raw weekly periods -> the 5 labeled rows with derived
// times and checkmarks. This component only formats them and attaches the
// site's i18n labels (which Google never provides). ----
type Window = { start: string; end: string }

// Display range (NBSP around the en dash — matches the existing strings exactly).
const range = ({ start, end }: Window) => `${start} – ${end}`

const ROW_TITLE_KEYS: Record<OpeningRow['key'], string> = {
  noon: 'home.hours.noonTitle',
  evening: 'home.hours.eveningTitle',
  lunch: 'home.hours.lunchTitle',
  'buffet-noon': 'home.hours.buffetNoonTitle',
  'buffet-evening': 'home.hours.buffetEveningTitle',
}

export default function OpeningHours() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { hours } = useHours()
  // Effective status: real Google Business hours (special/vacation-adjusted +
  // business status) when available, otherwise the default schedule.
  const [status, setStatus] = useState(() => isEffectivelyOpen(new Date(), hours))

  useEffect(() => {
    const checkStatus = () => setStatus(isEffectivelyOpen(new Date(), hours))
    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [hours])

  const chipLabel =
    status.reason === 'closedSpecial'
      ? t('home.hours.closedSpecial')
      : status.reason === 'closedTemporarily'
        ? t('home.hours.closedTemporarily')
        : status.isOpen
          ? t('home.hours.open')
          : t('home.hours.closed')

  // The weekly table, derived from Google's regular hours (hardcoded schedule
  // only while /hours has no data). buildOpeningRows maps the data onto the
  // table's rows — times AND checkmarks follow the data.
  const week: WeekRow[] = hours?.regularHours
    ? weekRowsFromRegularHours(hours.regularHours)
    : weekRowsFromDefaultSchedule()
  const rows = buildOpeningRows(week).map((row) => ({
    key: row.key,
    title: t(ROW_TITLE_KEYS[row.key]),
    time: range(row.time),
    days: row.days,
  }))

  const dayShorts = [
    t('home.hours.mondayShort'),
    t('home.hours.tuesdayShort'),
    t('home.hours.wednesdayShort'),
    t('home.hours.thursdayShort'),
    t('home.hours.fridayShort'),
    t('home.hours.saturdayShort'),
    t('home.hours.sundayShort'),
    t('home.hours.holidayShort'),
  ]

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
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ color: 'white', fontWeight: 700 }}>
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
        {isMobile ? (
          /* Mobile: card-based layout — one card per time slot with day indicators */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {rows.map((row) => (
              <Box key={row.key}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1.3, fontSize: '0.9rem' }}>
                    {row.title}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3, fontSize: '0.95rem' }}>
                    {row.time}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'space-between' }}>
                  {dayShorts.map((label, j) => {
                    const isHoliday = j === dayShorts.length - 1
                    return (
                      <Box key={j} sx={{
                        textAlign: 'center',
                        minWidth: 0,
                        flex: '1 1 0',
                        px: 0.15,
                        py: 0.35,
                        borderRadius: 0.75,
                        fontSize: '0.68rem',
                        fontWeight: row.days[j] ? 700 : 400,
                        color: row.days[j] ? '#fff' : theme.palette.text.disabled,
                        bgcolor: row.days[j] ? theme.palette.primary.main : 'transparent',
                        border: row.days[j] ? 'none' : `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isHoliday ? (
                          <Star sx={{ fontSize: '0.7rem' }} />
                        ) : (
                          label
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            ))}
            <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', mt: 0.5 }}>
              {t('home.hours.starHint')}
            </Typography>
          </Box>
        ) : (
          /* Desktop: grid table with day columns */
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: `120px repeat(${dayShorts.length}, 1fr)`,
            }}>
              {/* Header row */}
              <Box sx={{
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 1.5,
              }} />
              {dayShorts.map((d, i) => (
                <Box key={i} sx={{
                  textAlign: 'center',
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  whiteSpace: 'nowrap',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.95rem',
                  px: 1,
                  py: 1.5,
                }}>
                  {d}
                </Box>
              ))}

              {/* Data rows */}
              {rows.map((row) => (
                <Fragment key={row.key}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 1.5, pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1.3, fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      {row.title}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                      {row.time}
                    </Typography>
                  </Box>
                  {row.days.map((available, j) => (
                    <Box key={j} sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: '1.1rem',
                      py: 1.5,
                      color: available ? theme.palette.primary.main : theme.palette.text.disabled,
                      fontWeight: available ? 600 : 400,
                    }}>
                      {available ? '✓' : '–'}
                    </Box>
                  ))}
                </Fragment>
              ))}
            </Box>
          </Box>
        )}
        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          {t('home.hours.reservation')}
        </Typography>
    </Box>
    </ContentCard>
  )
}
