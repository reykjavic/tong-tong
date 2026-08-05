import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, Button, Chip, Skeleton, useTheme, useMediaQuery, Stack } from '@mui/material'
import { usePosts, formatPostDate } from '../posts'
import OpeningHours from '../components/features/OpeningHours'
import VisuallyHiddenH1 from '../components/ui/VisuallyHiddenH1'
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
}

function HeroSection() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const slides: HeroSlide[] = [
    { image: heroInterior1, title: t('home.hero.title1'), subtitle: t('home.hero.title2') },
    { image: heroInterior2, title: t('home.hero.title1'), subtitle: t('home.hero.title2') },
    { image: heroImage, title: t('home.hero.title1'), subtitle: t('home.hero.title2') },
    { bg: 'linear-gradient(135deg, #7B1F2B 0%, #4A1018 100%)', title: t('contact.title'), subtitle: '' },
  ]

  return (
    <Box sx={{
      position: 'relative',
      overflow: 'hidden',
      width: '100vw',
      maxWidth: '100vw',
      marginLeft: 'calc(50% - 50vw)',
      marginRight: 'calc(50% - 50vw)',
      // Swiper navigation overrides — glass-morphism buttons, properly sized & padded for mobile/desktop
      '& .swiper-button-next, & .swiper-button-prev': {
        color: '#fff',
        width: 36,
        height: 36,
        borderRadius: '50%',
        bgcolor: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(6px)',
        transition: 'background-color 0.2s ease',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
        '&::after': {
          fontSize: '0.85rem',
          fontWeight: 700,
          [theme.breakpoints.up('sm')]: { fontSize: '1.1rem' },
        },
        [theme.breakpoints.up('sm')]: {
          width: 44,
          height: 44,
        },
      },
      '& .swiper-button-next': {
        right: 8,
        [theme.breakpoints.up('sm')]: { right: 16 },
      },
      '& .swiper-button-prev': {
        left: 8,
        [theme.breakpoints.up('sm')]: { left: 16 },
      },
      '& .swiper-pagination-bullet': {
        bgcolor: '#fff',
        opacity: 0.5,
      },
      '& .swiper-pagination-bullet-active': {
        bgcolor: '#fff',
        opacity: 1,
      },
    }}>
      <Swiper
        modules={[Autoplay, Pagination, SwiperNavigation]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 10000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop
        style={{ height: isMobile ? '100dvh' : '100vh' }}
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
                ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${slide.image}) center/cover no-repeat`
                : slide.bg,
              px: 2,
              py: { xs: 8, sm: 10 },
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
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>
      {/* Top gradient keeps the floating navbar readable over any slide. */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 30%, transparent 60%)',
      }} />
      {/* CTA buttons are a fixed overlay so they don't move when switching slides. */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={isMobile ? 1 : 2}
        sx={{
          position: 'absolute',
          bottom: { xs: '16%', sm: '14%' },
          left: 0,
          right: 0,
          zIndex: 3,
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Button
          variant="contained"
          component={isMobile ? 'a' : Link}
          {...(isMobile
            ? { href: '/tong-tong-2026.pdf' }
            : { to: '/menu' }
          )}
          sx={{
            bgcolor: '#fff', color: theme.palette.primary.main, fontWeight: 700,
            px: isMobile ? 3 : 4, py: isMobile ? 1 : 1.2,
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
          }}
        >
          {t('home.hero.ctaMenu')}
        </Button>
        <Button
          variant="outlined"
          component={Link}
          to={isMobile ? '/hours' : '/contact'}
          sx={{
            borderColor: '#fff', color: '#fff', fontWeight: 700,
            px: isMobile ? 3 : 4, py: isMobile ? 1 : 1.2,
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          {isMobile ? t('home.hero.ctaHours') : t('home.hero.ctaContact')}
        </Button>
      </Stack>
    </Box>
  )
}

function LatestNewsSection() {
  const { t, language } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { status, posts } = usePosts()
  const post = posts[0]

  const sectionHeading = (
    <>
      <Typography variant={isMobile ? 'h5' : 'h3'} sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
        {t('home.latestNews.title')}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        {t('home.latestNews.subtitle')}
      </Typography>
    </>
  )

  if (status === 'loading') {
    return (
      <Container maxWidth={isMobile ? false : 'lg'} disableGutters={isMobile} sx={{ py: { xs: 4, sm: 6 } }}>
        <Box sx={{ px: isMobile ? 2 : 0 }}>{sectionHeading}</Box>
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
      </Container>
    )
  }

  if (status === 'error' || (status === 'ready' && !post)) {
    return (
      <Container maxWidth={isMobile ? false : 'lg'} disableGutters={isMobile} sx={{ py: { xs: 4, sm: 6 } }}>
        <Box sx={{ px: isMobile ? 2 : 0 }}>{sectionHeading}</Box>
        <Typography variant="body1" sx={{ px: isMobile ? 2 : 0, color: 'text.secondary' }}>
          {t('posts.noPosts')}
        </Typography>
      </Container>
    )
  }

  if (!post) return null

  const thumbnail = post.featuredImage ? (
    <Box component="img" src={post.featuredImage} alt={post.title} sx={{ width: isMobile ? '100%' : 280, height: isMobile ? 200 : 'auto', objectFit: 'cover' }} />
  ) : (
    <Box sx={{
      width: isMobile ? '100%' : 280, height: isMobile ? 200 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${theme.palette.primary.main}40, ${theme.palette.secondary.main}60)`,
    }}>
      <Typography variant={isMobile ? 'h5' : 'h2'} sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>TT</Typography>
    </Box>
  )

  const postContent = (
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
  )

  return (
    <Container maxWidth={isMobile ? false : 'lg'} disableGutters={isMobile} sx={{ py: { xs: 4, sm: 6 } }}>
      <Box sx={{ px: isMobile ? 2 : 0 }}>{sectionHeading}</Box>
      <Paper elevation={3} sx={{
        borderRadius: 3, overflow: 'hidden',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        bgcolor: theme.palette.background.paper,
      }}>
        {thumbnail}
        {postContent}
      </Paper>
    </Container>
  )
}

export default function Home() {
  const { t } = useI18n()
  return (
    <Box sx={{ py: 0 }}>
      <VisuallyHiddenH1>{t('meta.home.title')}</VisuallyHiddenH1>
      <HeroSection />
      <LatestNewsSection />
      <OpeningHours />
    </Box>
  )
}