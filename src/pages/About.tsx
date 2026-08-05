import { useI18n } from '../i18n'
import ContentCard from '../components/ui/ContentCard'
import PageContainer from '../components/layout/PageContainer'
import { Title, BodyText } from '../components/ui/typography'
import { alpha } from '@mui/material/styles'
import { Typography, Grid, Card, CardContent, Stack, useTheme, useMediaQuery } from '@mui/material'

interface Highlight {
  icon: string
  title: string
  text: string
}

export default function About() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const cardStyle = {
    height: '100%',
    borderRadius: 3,
    bgcolor: theme.palette.background.paper,
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.15)}` },
  }

  const highlights: Highlight[] = [
    { icon: '🥡', title: t('about.buffet.title'), text: t('about.buffet.text') },
    { icon: '🥢', title: t('about.teppanyaki.title'), text: t('about.teppanyaki.text') },
    { icon: '✨', title: t('about.service.title'), text: t('about.service.text') },
    { icon: '🎉', title: t('about.events.title'), text: t('about.events.text') },
  ]

  return (
    <PageContainer title={t('about.title')}>
      <ContentCard>
        <Stack spacing={2}>
          <Title variant="h5">{t('about.greeting')}</Title>
          <BodyText>{t('about.intro1')}</BodyText>
          <BodyText>{t('about.intro2')}</BodyText>
        </Stack>
      </ContentCard>

      <Stack spacing={1} alignItems="center" sx={{ mt: { xs: 5, sm: 7 }, mb: { xs: 4, sm: 5 } }}>
        <Title variant={isMobile ? 'h5' : 'h3'}>{t('about.highlightsTitle')}</Title>
        <BodyText>{t('about.highlightsSubtitle')}</BodyText>
      </Stack>

      <Grid container spacing={3}>
        {highlights.map((item) => (
          <Grid item xs={12} sm={6} key={item.title}>
            <Card sx={cardStyle}>
              <CardContent sx={{ py: 4 }}>
                <Stack spacing={1} alignItems="center">
                  <Typography variant={isMobile ? 'h2' : 'h1'}>{item.icon}</Typography>
                  <Title variant="h6">{item.title}</Title>
                  <BodyText variant="body2">{item.text}</BodyText>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Stack spacing={1} alignItems="center" sx={{ mt: { xs: 5, sm: 7 } }}>
        <Title variant={isMobile ? 'h5' : 'h4'}>{t('about.closing')}</Title>
        <BodyText>{t('about.signoff')}</BodyText>
      </Stack>
    </PageContainer>
  )
}
