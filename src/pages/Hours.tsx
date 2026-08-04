import { useI18n } from '../i18n'
import VisuallyHiddenH1 from '../components/VisuallyHiddenH1'
import OpeningHours from '../components/OpeningHours'

export default function Hours() {
  const { t } = useI18n()
  return (
    <>
      <VisuallyHiddenH1>{t('meta.hours.title')}</VisuallyHiddenH1>
      <OpeningHours />
    </>
  )
}
