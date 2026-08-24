import { useI18n } from '../../i18n'
import { Box, Typography, Chip, useTheme, useMediaQuery, Divider } from '@mui/material'
import { AccessTime, Star } from '@mui/icons-material'
import { Fragment, useState, useEffect } from 'react'
import {
  HOURS_SCHEDULE,
  isEffectivelyOpen,
  useHours,
  weekRowsFromDefaultSchedule,
  weekRowsFromRegularHours,
  type WeekRow,
} from '../../hooks/hours'
import ContentCard from '../ui/ContentCard'

// ---- Row windows. The core lunch/dinner times are DERIVED from Google's
// regularOpeningHours (single source of truth — change a shift on Google, the
// table follows within a day); the Mittagstisch/buffet-noon rows reuse the
// lunch window. Only the buffet-evening times are static: Google only models
// "when are we open" (17:30–22:30), not "buffet until 22:00". ----
type Window = { start: string; end: string }
const BUFFET_EVENING: Window = { start: '18:00', end: '22:00' }

// Display range (NBSP around the en dash — matches the existing strings exactly).
const range = ({ start, end }: Window) => `${start} – ${end}`

// ---- Day columns: the table's column order, Mon … Sun, then the holiday star.
// onDays spells out the active columns by name instead of a cryptic boolean row. ----
type DayColumn = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'holiday'
const DAY_COLUMNS: DayColumn[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday']
const onDays = (...days: DayColumn[]) => DAY_COLUMNS.map((d) => days.includes(d))

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
  // only while /hours has no data). Tuesday's windows give the core
  // lunch/dinner times the merchandising rows reuse.
  const week: WeekRow[] = hours?.regularHours
    ? weekRowsFromRegularHours(hours.regularHours)
    : weekRowsFromDefaultSchedule()
  const lunchWindow = week[1]?.windows[0] ?? HOURS_SCHEDULE.lunch
  const dinnerWindow = week[1]?.windows[1] ?? HOURS_SCHEDULE.dinner

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

  const rows = [
    { key: 'noon',           title: t('home.hours.noonTitle'),           time: range(lunchWindow),         days: onDays('tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday') },
    { key: 'evening',        title: t('home.hours.eveningTitle'),        time: range(dinnerWindow),        days: onDays('tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday') },
    { key: 'lunch',          title: t('home.hours.lunchTitle'),          time: range(lunchWindow),         days: onDays('tue', 'wed', 'thu', 'fri') },
    { key: 'buffet-noon',    title: t('home.hours.buffetNoonTitle'),     time: range(lunchWindow),         days: onDays('sun', 'holiday') },
    { key: 'buffet-evening', title: t('home.hours.buffetEveningTitle'),  time: range(BUFFET_EVENING),      days: onDays('fri', 'sat', 'sun', 'holiday') },
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
