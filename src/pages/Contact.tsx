import { useI18n } from '../i18n'
import { Box, Container, Typography, Paper, Button, Link as MuiLink, Grid, Divider, useTheme, useMediaQuery } from '@mui/material'
import { Place, Phone } from '@mui/icons-material'
import OpeningHours from '../components/OpeningHours'

const MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2536.859714738695!2d8.391808216312537!3d50.518176990362726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bc4f15ef994165%3A0x1b21e30f9a0f016a!2sChina-Restaurant%20Tong%20Tong!5e0!3m2!1sen!2sde!4v1586771078683!5m2!1sen!2sde'

export default function Contact() {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <>
      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
        <Typography variant={isMobile ? 'h4' : 'h2'} sx={{ fontWeight: 700, mb: 3, color: theme.palette.primary.main }}>
          {t('contact.title')}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
                <Place sx={{ verticalAlign: 'middle', mr: 1 }} />
                {t('contact.address')}
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                {t('contact.restaurantName')}
                <br />
                {t('contact.street')}
                <br />
                {t('contact.city')}
              </Typography>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
                <Phone sx={{ verticalAlign: 'middle', mr: 1 }} />
                {t('contact.phone')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                <MuiLink href="tel:+496442931082" sx={{ color: theme.palette.primary.main, textDecoration: 'none', fontWeight: 600 }}>
                  {t('contact.phoneNumber')}
                </MuiLink>
              </Typography>
              <Button
                variant="contained"
                component="a"
                href="tel:+496442931082"
                sx={{
                  bgcolor: theme.palette.primary.main,
                  fontWeight: 600,
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                }}
              >
                <Phone sx={{ mr: 1, fontSize: 20 }} />
                {t('contact.clickToCall')}
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
                {t('contact.directions')}
              </Typography>
              <Box sx={{ position: 'relative', width: '100%', pt: '70%', borderRadius: 2, overflow: 'hidden' }}>
                <iframe
                  src={MAPS_EMBED_URL}
                  title={t('contact.map')}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <OpeningHours />
    </>
  )
}
