import { useI18n } from '../i18n'
import { PAGE_VERTICAL_PADDING } from '../layout'
import VisuallyHiddenH1 from '../components/ui/VisuallyHiddenH1'
import ContentCard from '../components/ui/ContentCard'
import { Title, BodyText } from '../components/ui/typography'
import { Container, Stack } from '@mui/material'

interface Section {
  title: string
  text: string
}

export default function Datenschutz() {
  const { t } = useI18n()

  const sections: Section[] = [
    { title: t('datenschutz.controller.title'), text: t('datenschutz.controller.text') },
    { title: t('datenschutz.hosting.title'), text: t('datenschutz.hosting.text') },
    { title: t('datenschutz.fonts.title'), text: t('datenschutz.fonts.text') },
    { title: t('datenschutz.localStorage.title'), text: t('datenschutz.localStorage.text') },
    { title: t('datenschutz.contact.title'), text: t('datenschutz.contact.text') },
    { title: t('datenschutz.rights.title'), text: t('datenschutz.rights.text') },
  ]

  return (
    <Container maxWidth="lg" sx={{ py: PAGE_VERTICAL_PADDING }}>
      <VisuallyHiddenH1>{t('datenschutz.title')}</VisuallyHiddenH1>
      <ContentCard>
        <Stack spacing={2}>
          <BodyText>{t('datenschutz.intro')}</BodyText>
          {sections.map((section) => (
            <Stack key={section.title} spacing={1}>
              <Title variant="h6">{section.title}</Title>
              <BodyText>{section.text}</BodyText>
            </Stack>
          ))}
        </Stack>
      </ContentCard>
    </Container>
  )
}
