import { useI18n } from '../i18n'
import ScreenReaderPageTitle from '../components/ui/ScreenReaderPageTitle'
import OpeningHours from '../components/features/OpeningHours'

export default function Hours() {
  const { t } = useI18n()
  return (
    <>
      <ScreenReaderPageTitle>{t('meta.hours.title')}</ScreenReaderPageTitle>
      <OpeningHours />
    </>
  )
}
