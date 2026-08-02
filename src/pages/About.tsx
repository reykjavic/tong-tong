import { useI18n } from '../i18n'
import { Box, Container, Paper, Typography, Grid, Card, CardContent, useTheme, useMediaQuery } from '@mui/material'

export default function About() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const highlights = [
    { icon: '🥡', title: t('about.buffet.title'), text: t('about.buffet.text') },
    { icon: '🥢', title: t('about.teppanyaki.title'), text: t('about.teppanyaki.text') },
    { icon: '✨', title: t('about.service.title'), text: t('about.service.text') },
    { icon: '🎉', title: t('about.events.title'), text: t('about.events.text') },
  ]

  return (
    <Box>
      <Box sx={{
        py: { xs: 5, sm: 7 },
        textAlign: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      }}>
        <Container maxWidth="lg">
          <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ color: 'white', fontWeight: 700 }}>
            {t('about.title')}
          </Typography>
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400, mt: 1 }}>
            {t('about.subtitle')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
        <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 }, bgcolor: theme.palette.background.paper }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
            {t('about.greeting')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 2 }}>
            {t('about.intro1')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            {t('about.intro2')}
          </Typography>
        </Paper>

        <Typography variant={isMobile ? 'h5' : 'h3'} sx={{ fontWeight: 700, mt: { xs: 5, sm: 7 }, mb: 1, textAlign: 'center', color: theme.palette.primary.main }}>
          {t('about.highlightsTitle')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: { xs: 4, sm: 5 }, textAlign: 'center' }}>
          {t('about.highlightsSubtitle')}
        </Typography>
        <Grid container spacing={3}>
          {highlights.map((item, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Card sx={{
                height: '100%',
                borderRadius: 3,
                bgcolor: theme.palette.background.paper,
                boxShadow: `0 4px 20px ${theme.palette.primary.main}15`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${theme.palette.primary.main}25` },
              }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant={isMobile ? 'h2' : 'h1'} sx={{ mb: 1 }}>{item.icon}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: { xs: 5, sm: 7 } }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
            {t('about.closing')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            {t('about.signoff')}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
