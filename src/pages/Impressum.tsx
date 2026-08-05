import { useI18n } from '../i18n'
import { PAGE_VERTICAL_PADDING } from '../layout'
import VisuallyHiddenH1 from '../components/ui/VisuallyHiddenH1'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import { Container, Stack } from '@mui/material'

export default function Impressum() {
  const { t } = useI18n()

  return (
    <Container maxWidth="lg" sx={{ py: PAGE_VERTICAL_PADDING }}>
      <VisuallyHiddenH1>{t('impressum.title')}</VisuallyHiddenH1>
      <ContentCard>
        <Stack spacing={2}>
          <Title variant="h5">{t('impressum.heading')}</Title>
          <Title variant="h6" color="text.primary">{t('impressum.name')}</Title>
          <BodyText>
            <strong>{t('impressum.representedBy')}</strong> {t('impressum.representatives')}
          </BodyText>
          <BodyText>
            <strong>{t('impressum.address')}</strong> {t('impressum.street')}, {t('impressum.city')}
          </BodyText>
          <BodyText>
            <strong>{t('impressum.phone')}</strong> {t('impressum.phoneNumber')}
          </BodyText>
          <BodyText>
            <strong>{t('impressum.vatLabel')}</strong>
            <br />
            {t('impressum.vatNumber')}
          </BodyText>
          <BodyText>
            <strong>{t('impressum.authorityLabel')}</strong> {t('impressum.authority')}
          </BodyText>
        </Stack>
      </ContentCard>
    </Container>
  )
}
