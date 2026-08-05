import { ReactNode } from 'react'
import { Container } from '@mui/material'
import { PAGE_VERTICAL_PADDING } from '../../layout'
import ScreenReaderPageTitle from '../ui/ScreenReaderPageTitle'

// Per-page wrapper: the standard max-width container + a screen-reader-only
// <h1> with the page title, so routes don't each repeat this scaffold.
// (PageLayout is the app-wide shell around the router; this wraps one page's
// content inside it.)
interface PageContainerProps {
  title: string
  // Pass isMobile to let the container go full-bleed (no gutters) on small
  // screens. Defaults to false — most pages keep a centered lg container.
  isMobile?: boolean
  children: ReactNode
}

export default function PageContainer({ title, isMobile = false, children }: PageContainerProps) {
  return (
    <Container maxWidth={isMobile ? false : 'lg'} disableGutters={isMobile} sx={{ py: PAGE_VERTICAL_PADDING }}>
      <ScreenReaderPageTitle>{title}</ScreenReaderPageTitle>
      {children}
    </Container>
  )
}
