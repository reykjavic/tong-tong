import { ReactNode } from 'react'
import { Box } from '@mui/material'
import { PAGE_VERTICAL_PADDING } from '../../layout'
import ScreenReaderPageTitle from '../ui/ScreenReaderPageTitle'

// Per-page wrapper: vertical rhythm + a screen-reader-only <h1> with the page
// title, so routes don't each repeat this scaffold.
// (PageLayout is the app-wide shell that owns the max-width gutter; this wraps
// one page's content inside it with only the vertical padding.)
interface PageContainerProps {
  title: string
  children: ReactNode
}

export default function PageContainer({ title, children }: PageContainerProps) {
  return (
    <Box sx={{ py: PAGE_VERTICAL_PADDING }}>
      <ScreenReaderPageTitle>{title}</ScreenReaderPageTitle>
      {children}
    </Box>
  )
}
