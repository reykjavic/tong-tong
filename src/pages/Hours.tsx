import { Box } from '@mui/material'
import { useI18n } from '../i18n'
import { PAGE_VERTICAL_PADDING } from '../layout'
import ScreenReaderPageTitle from '../components/ui/ScreenReaderPageTitle'
import OpeningHours from '../components/features/OpeningHours'

export default function Hours() {
  const { t } = useI18n()
  return (
    <>
      <ScreenReaderPageTitle>{t('meta.hours.title')}</ScreenReaderPageTitle>
      <Box sx={{ py: PAGE_VERTICAL_PADDING }}>
        <OpeningHours />
      </Box>
    </>
  )
}
