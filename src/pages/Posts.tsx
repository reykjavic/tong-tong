import { useI18n } from '../i18n'
import PageContainer from '../components/layout/PageContainer'
import { Box, Typography, Paper, Button, Card, CardContent, CardMedia, Skeleton, useTheme } from '@mui/material'
import { Link } from 'wouter'
import { usePosts, formatPostDate, type Post } from '../hooks/posts'
import Markdown from '../components/features/Markdown'

function PostCard({ post, language }: { post: Post; language: string }) {
  const theme = useTheme()

  return (
    <Card elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
      {post.featuredImage && (
        <CardMedia component="img" image={post.featuredImage} alt={post.title} sx={{ height: 240, objectFit: 'cover' }} />
      )}
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: theme.palette.primary.main }}>
          {post.title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          {formatPostDate(post.date, language)}
        </Typography>
        {post.excerpt && (
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
            {post.excerpt}
          </Typography>
        )}
        <Markdown source={post.content} />
      </CardContent>
    </Card>
  )
}

function LoadingCard() {
  return (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', p: { xs: 3, sm: 4 }, mb: 4 }}>
      <Skeleton variant="text" width="50%" sx={{ mb: 1 }} />
      <Skeleton variant="text" width="30%" sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="70%" />
    </Paper>
  )
}

export default function Posts() {
  const { t, language } = useI18n()
  const { status, posts } = usePosts()

  const showEmpty = status === 'error' || (status === 'ready' && posts.length === 0)

  return (
    <PageContainer title={t('posts.title')}>
      {status === 'loading' && <LoadingCard />}
        {showEmpty && (
          <Paper elevation={2} sx={{ p: { xs: 3, sm: 6 }, borderRadius: 3 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
              {t('posts.noPosts')}
            </Typography>
            <Button variant="contained" component={Link} to="/">
              {t('common.backToHome')}
            </Button>
          </Paper>
        )}
        {status === 'ready' && posts.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} language={language} />
            ))}
          </Box>
        )}
    </PageContainer>
  )
}
