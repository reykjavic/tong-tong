import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Box, Typography, Link as MuiLink } from '@mui/material'

const components: Components = {
  p: ({ children }) => (
    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography variant="h5" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  a: ({ children, href }) => (
    <MuiLink href={href} target="_blank" rel="noreferrer">
      {children}
    </MuiLink>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, mb: 2 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, mb: 2 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  ),
  blockquote: ({ children }) => (
    <Box sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 2, my: 2, color: 'text.secondary' }}>
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box component="code" sx={{ bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>
      {children}
    </Box>
  ),
}

export default function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {source}
    </ReactMarkdown>
  )
}
