import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, Chip, useTheme, useMediaQuery, Divider } from '@mui/material'
import { AccessTime, Star } from '@mui/icons-material'
import { Fragment, useState, useEffect } from 'react'

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
      // Closed Mondays; otherwise open 11:30-14:30 (lunch) and 17:30-22:30 (dinner)
      const isClosedDay = day === 1
      const lunchTime = minutes >= 11 * 60 + 30 && minutes < 14 * 60 + 30
      const dinnerTime = minutes >= 17 * 60 + 30 && minutes < 22 * 60 + 30
      setIsOpen(!isClosedDay && (lunchTime || dinnerTime))
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
    { key: 'noon',           title: t('home.hours.noonTitle'),           time: '11:30 – 14:30', days: [false, true,  true,  true,  true,  true,  true,  true ] },
    { key: 'evening',        title: t('home.hours.eveningTitle'),        time: '17:30 – 22:30', days: [false, true,  true,  true,  true,  true,  true,  true ] },
    { key: 'lunch',          title: t('home.hours.lunchTitle'),          time: '11:30 – 14:30', days: [false, true,  true,  true,  true,  true,  false, false] },
    { key: 'buffet-noon',    title: t('home.hours.buffetNoonTitle'),     time: '11:30 – 14:30', days: [false, false, false, false, false, false, true,  true ] },
    { key: 'buffet-evening', title: t('home.hours.buffetEveningTitle'),  time: '18:00 – 22:00', days: [false, false, false, false, true,  true,  true,  true ] },
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
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
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
