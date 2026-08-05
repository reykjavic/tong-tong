import { useI18n } from '../../i18n'
import { Box, Container, Paper, Typography, Chip, useTheme, useMediaQuery, Divider } from '@mui/material'
import { AccessTime, Star } from '@mui/icons-material'
import { Fragment, useState, useEffect } from 'react'

// ---- Schedule: one source of truth for both the table and the live chip. ----
type Window = { start: string; end: string }
const SCHEDULE = {
  lunch:         { start: '11:30', end: '14:30' },
  dinner:        { start: '17:30', end: '22:30' },
  lunchSpecial:  { start: '11:30', end: '14:30' },
  buffetNoon:    { start: '11:30', end: '14:30' },
  buffetEvening: { start: '18:00', end: '22:00' },
} as const

// Time helpers: minute-of-day arithmetic for the open check, and the display
// range (NBSP around the en dash — matches the existing strings exactly).
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
const inWindow = (minutes: number, { start, end }: Window) =>
  minutes >= toMinutes(start) && minutes < toMinutes(end)
const range = ({ start, end }: Window) => `${start} – ${end}`

// ---- Day columns: the table's column order, Mon … Sun, then the holiday star.
// onDays spells out the active columns by name instead of a cryptic boolean row. ----
type DayColumn = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'holiday'
const DAY_COLUMNS: DayColumn[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday']
const onDays = (...days: DayColumn[]) => DAY_COLUMNS.map((d) => days.includes(d))

// Date.prototype.getDay() numbers (0 = Sunday) — the JS weekday convention
// differs from the table's Mon-first columns above, so it gets its own names.
const DOW = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 } as const

export default function OpeningHours() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date()
      const day = now.getDay()
      const minutes = now.getHours() * 60 + now.getMinutes()
      // Closed Mondays; otherwise open for lunch and dinner.
      const isClosedDay = day === DOW.MON
      const isOpenTime = inWindow(minutes, SCHEDULE.lunch) || inWindow(minutes, SCHEDULE.dinner)
      setIsOpen(!isClosedDay && isOpenTime)
    }
    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

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
    { key: 'noon',           title: t('home.hours.noonTitle'),           time: range(SCHEDULE.lunch),         days: onDays('tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday') },
    { key: 'evening',        title: t('home.hours.eveningTitle'),        time: range(SCHEDULE.dinner),        days: onDays('tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday') },
    { key: 'lunch',          title: t('home.hours.lunchTitle'),          time: range(SCHEDULE.lunchSpecial),  days: onDays('tue', 'wed', 'thu', 'fri', 'sat') },
    { key: 'buffet-noon',    title: t('home.hours.buffetNoonTitle'),     time: range(SCHEDULE.buffetNoon),    days: onDays('sun', 'holiday') },
    { key: 'buffet-evening', title: t('home.hours.buffetEveningTitle'),  time: range(SCHEDULE.buffetEvening), days: onDays('fri', 'sat', 'sun', 'holiday') },
  ]

  return (
    <Container maxWidth={isMobile ? false : 'lg'} disableGutters={isMobile} sx={{ py: { xs: 4, sm: 6 } }}>
      <Paper elevation={3} sx={{
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme.palette.background.paper,
      }}>
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
            label={isOpen ? t('home.hours.open') : t('home.hours.closed')}
            sx={{
              bgcolor: isOpen ? '#4CAF50' : '#F44336',
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
      </Paper>
    </Container>
  )
}
