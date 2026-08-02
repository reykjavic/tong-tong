import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, Button, Chip, Skeleton, useTheme, useMediaQuery, Stack } from '@mui/material'
import { usePosts, formatPostDate } from '../posts'
import OpeningHours from '../components/OpeningHours'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation as SwiperNavigation } from 'swiper/modules'
import { Link } from 'wouter'
import heroInterior1 from '../assets/images/hero-interior-1.webp'
import heroInterior2 from '../assets/images/hero-interior-2.webp'
import heroImage from '../assets/images/legacy-background-image.webp'

interface HeroSlide {
  bg?: string
  image?: string
  title: string
  subtitle: string
  ctaMenu?: boolean
  ctaContact?: boolean
}

function HeroSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const slides: HeroSlide[] = [
    { image: heroInterior1, title: t('home.hero.title1'), subtitle: t('home.hero.title2'), ctaMenu: true },
    { image: heroInterior2, title: t('home.hero.title1'), subtitle: t('home.hero.title2'), ctaMenu: false },
    { image: heroImage, title: t('home.hero.title1'), subtitle: t('home.hero.title2'), ctaMenu: false },
    { bg: 'linear-gradient(135deg, #7B1F2B 0%, #4A1018 100%)', title: t('contact.title'), subtitle: '', ctaContact: true },
  ]

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      <Swiper
        modules={[Autoplay, Pagination, SwiperNavigation]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 10000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop
        style={{ height: isMobile ? '400px' : '550px' }}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <Box sx={{
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: slide.image ? 'flex-end' : 'center',
              textAlign: 'center',
              background: slide.image
                ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${slide.image}) center/cover no-repeat`
                : slide.bg,
              px: 2,
              py: { xs: 4, sm: 6 },
            }}>
              {!slide.image && (
                <>
                  <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ color: 'white', fontWeight: 700, mb: 1, textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
                    {slide.title}
                  </Typography>
                  {slide.subtitle && (
                    <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, mb: isMobile ? 2 : 3 }}>
                      {slide.subtitle}
                    </Typography>
                  )}
                </>
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
  const { t, language } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { status, posts } = usePosts()
  const post = posts[0]

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant={isMobile ? 'h5' : 'h3'} sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
        {t('home.latestNews.title')}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        {t('home.latestNews.subtitle')}
      </Typography>
      {status === 'loading' && (
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
          <Skeleton variant="rectangular" sx={{ width: isMobile ? '100%' : 280, height: isMobile ? 200 : 'auto', borderRadius: 0 }} />
          <Box sx={{ p: { xs: 3, sm: 4 }, flex: 1 }}>
            <Skeleton variant="text" width="30%" sx={{ mb: 2 }} />
            <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" sx={{ mb: 3 }} />
            <Skeleton variant="rectangular" width={140} height={40} sx={{ borderRadius: 2 }} />
          </Box>
        </Paper>
      )}
      {(status === 'error' || (status === 'ready' && !post)) && (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('posts.noPosts')}
        </Typography>
      )}
      {status === 'ready' && post && (
        <Paper elevation={3} sx={{
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          bgcolor: theme.palette.background.paper,
        }}>
          {post.featuredImage ? (
            <Box component="img" src={post.featuredImage} alt={post.title} sx={{ width: isMobile ? '100%' : 280, height: isMobile ? 200 : 'auto', objectFit: 'cover' }} />
          ) : (
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
          )}
          <Box sx={{ p: { xs: 3, sm: 4 }, flex: 1 }}>
            <Chip label={t('home.latestNews.badge')} size="small" sx={{ bgcolor: theme.palette.primary.main, color: 'white', fontWeight: 600, mb: 2 }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 1 }}>
              {post.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              {formatPostDate(post.date, language)}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
              {post.excerpt}
            </Typography>
            <Button variant="contained" component={Link} to="/posts" sx={{ bgcolor: theme.palette.primary.main, fontWeight: 600, '&:hover': { bgcolor: theme.palette.primary.dark } }}>
              {t('home.latestNews.readMore')}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  )
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <LatestNewsSection />
      <OpeningHours />
    </>
  )
}