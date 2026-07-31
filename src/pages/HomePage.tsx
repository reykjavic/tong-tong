import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, Button, Chip, Grid, Card, CardContent, useTheme, useMediaQuery, Stack } from '@mui/material'
import { AccessTime } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation as SwiperNavigation } from 'swiper/modules'
import { Link } from 'wouter'

function HeroSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const slides = [
    { bg: 'linear-gradient(135deg, #00695C 0%, #004D40 100%)', title: t('home.hero.title1'), subtitle: t('home.hero.title2'), ctaMenu: true },
    { bg: 'linear-gradient(135deg, #2B2D42 0%, #1a1b2e 100%)', title: t('buffet.title'), subtitle: t('home.buffet.subtitle'), ctaMenu: false },
    { bg: 'linear-gradient(135deg, #7B1F2B 0%, #4A1018 100%)', title: t('contact.title'), subtitle: '', ctaContact: true },
  ]

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      <Swiper
        modules={[Autoplay, Pagination, SwiperNavigation]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop
        style={{ height: isMobile ? '400px' : '550px' }}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <Box sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: slide.bg,
              px: 2,
              py: { xs: 4, sm: 6 },
            }}>
              <Box sx={{
                width: isMobile ? 100 : 140,
                height: isMobile ? 100 : 140,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: isMobile ? 2 : 3,
                backdropFilter: 'blur(10px)',
              }}>
                <Typography variant={isMobile ? 'h2' : 'h1'} sx={{ color: 'white', fontWeight: 800, letterSpacing: 2 }}>
                  TT
                </Typography>
              </Box>
              <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ color: 'white', fontWeight: 700, mb: 1, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                {slide.title}
              </Typography>
              {slide.subtitle && (
                <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, mb: isMobile ? 2 : 3 }}>
                  {slide.subtitle}
                </Typography>
              )}
              <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(slide.ctaMenu || i === 0) && (
                  <Button variant="contained" component={Link} to="/menu" sx={{
                    bgcolor: '#fff', color: theme.palette.primary.main, fontWeight: 700, px: 4, py: 1.2, fontSize: '1.1rem',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  }}>
                    {t('home.hero.ctaMenu')}
                  </Button>
                )}
                {(slide.ctaContact || i === 0) && (
                  <Button variant="outlined" component={Link} to="/contact" sx={{
                    borderColor: '#fff', color: '#fff', fontWeight: 700, px: 4, py: 1.2, fontSize: '1.1rem',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.1)' },
                  }}>
                    {t('home.hero.ctaContact')}
                  </Button>
                )}
              </Stack>
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  )
}

function LatestNewsSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant={isMobile ? 'h5' : 'h3'} sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
        {t('home.latestNews.title')}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        {t('home.buffet.subtitle')}
      </Typography>
      <Paper elevation={3} sx={{
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        bgcolor: theme.palette.background.paper,
      }}>
        <Box sx={{
          width: isMobile ? '100%' : 280,
          height: isMobile ? 200 : 'auto',
          bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}40, ${theme.palette.secondary.main}60)`,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}40, ${theme.palette.secondary.main}60)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Typography variant={isMobile ? 'h5' : 'h2'} sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>
            TT
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 3, sm: 4 }, flex: 1 }}>
          <Chip label="Neu" size="small" sx={{ bgcolor: theme.palette.primary.main, color: 'white', fontWeight: 600, mb: 2 }} />
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 1 }}>
            {t('buffet.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
            {t('home.buffet.subtitle')}
          </Typography>
          <Button variant="contained" sx={{ bgcolor: theme.palette.primary.main, fontWeight: 600, '&:hover': { bgcolor: theme.palette.primary.dark } }}>
            {t('home.latestNews.readMore')}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

function BuffetTeaserSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const items = [
    { icon: '🥡', title: 'Flexibel', subtitle: 'Mehrere Buffet-Formate für jeden Anlass' },
    { icon: '🥢', title: 'Frisch', subtitle: 'Täglich frische Auswahl für Sie zubereitet' },
    { icon: '⭐', title: 'Beliebt', subtitle: 'Ein Favorit in Braunfels seit Jahren' },
  ]

  return (
    <Box sx={{
      py: { xs: 4, sm: 6 },
      bgcolor: theme.palette.primary.main + '08',
      borderTop: `1px solid ${theme.palette.primary.main}20`,
      borderBottom: `1px solid ${theme.palette.primary.main}20`,
    }}>
      <Container maxWidth="lg">
        <Typography variant={isMobile ? 'h5' : 'h3'} sx={{ fontWeight: 700, mb: 1, textAlign: 'center', color: theme.palette.primary.main }}>
          {t('home.buffet.title')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: { xs: 4, sm: 5 }, textAlign: 'center' }}>
          {t('home.buffet.subtitle')}
        </Typography>
        <Grid container spacing={3}>
          {items.map((item, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Card sx={{
                height: '100%',
                borderRadius: 3,
                bgcolor: theme.palette.background.paper,
                boxShadow: `0 4px 20px ${theme.palette.primary.main}15`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${theme.palette.primary.main}25` },
              }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant={isMobile ? 'h2' : 'h1'} sx={{ mb: 2 }}>{item.icon}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="contained" component={Link} to="/buffet" sx={{
            bgcolor: theme.palette.primary.main, fontWeight: 600, px: 5, py: 1.2, fontSize: '1.05rem',
            '&:hover': { bgcolor: theme.palette.primary.dark },
          }}>
            {t('home.buffet.cta')}
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

function OpeningHoursSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date()
      const day = now.getDay()
      const hour = now.getHours()
      // Simple open hours check: Tue-Sat 11:30-14:00 & 17:30-21:30, Sun 17:30-21:00, Closed Mon
      const isWeekdayOpen = day >= 2 && day <= 6
      const lunchTime = hour >= 11 && hour < 14
      const dinnerTime = hour >= 17 && hour < 22
      setIsOpen(isWeekdayOpen && (lunchTime || dinnerTime))
    }
    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const hours = [
    { day: t('home.hours.monday'), time: 'Ruhetag' },
    { day: t('home.hours.tuesday'), time: '11:30 - 14:00 | 17:30 - 21:30' },
    { day: t('home.hours.wednesday'), time: '11:30 - 14:00 | 17:30 - 21:30' },
    { day: t('home.hours.thursday'), time: '11:30 - 14:00 | 17:30 - 21:30' },
    { day: t('home.hours.friday'), time: '11:30 - 14:00 | 17:30 - 21:30' },
    { day: t('home.hours.saturday'), time: '11:30 - 14:00 | 17:30 - 21:30' },
    { day: t('home.hours.sunday'), time: '17:30 - 21:00' },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
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
        <Box sx={{ p: { xs: 3, sm: 4 } }}>
          <Grid container spacing={1}>
            {hours.map((h, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: i < hours.length - 1 ? `1px solid ${theme.palette.divider}` : 'none' }}>
                  <Typography variant="body1" sx={{ fontWeight: h.time === 'Ruhetag' ? 400 : 600, color: h.time === 'Ruhetag' ? 'text.disabled' : 'text.primary' }}>
                    {h.day}
                  </Typography>
                  <Typography variant="body1" sx={{
                    color: h.time === 'Ruhetag' ? theme.palette.text.disabled : theme.palette.primary.main,
                    fontWeight: h.time === 'Ruhetag' ? 400 : 600,
                    fontStyle: h.time === 'Ruhetag' ? 'italic' : 'normal',
                  }}>
                    {h.time}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    </Container>
  )
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <LatestNewsSection />
      <BuffetTeaserSection />
      <OpeningHoursSection />
    </>
  )
}