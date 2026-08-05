import { useI18n } from '../i18n'
import ContentCard from '../components/ui/ContentCard'
import PageContainer from '../components/layout/PageContainer'
import { Title, BodyText } from '../components/ui/typography'
import { Stack } from '@mui/material'

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
    <PageContainer title={t('datenschutz.title')}>
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
    </PageContainer>
  )
}
