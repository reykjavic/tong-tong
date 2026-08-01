import matter from 'gray-matter'
import { useEffect, useState } from 'react'

export interface Post {
  slug: string
  title: string
  date: string
  featuredImage: string | null
  excerpt: string
  content: string
}

export type PostsStatus = 'loading' | 'ready' | 'error'

export const GITHUB_OWNER = 'reykjavic'
export const GITHUB_REPO = 'tong-tong'
export const GITHUB_BRANCH = 'main'
export const POSTS_DIR = 'content/posts'

function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`
}

// Decap stores media paths as public_folder values (e.g. /images/foo.jpg).
// Serve them from GitHub so newly uploaded images appear without a rebuild.
export function resolveMedia(path: string): string {
  return path.startsWith('/images/') ? rawUrl(`public${path}`) : path
}

export function formatPostDate(iso: string, language: string): string {
  return new Date(iso).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…'
}

function stripMarkdown(md: string): string {
  return truncate(
    md
      .replace(/^#{1,6}\s+/gm, '') // headings
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
      .replace(/[`*_>~]/g, '') // emphasis / blockquote markers
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

async function fetchPosts(): Promise<Post[]> {
  const listRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}?ref=${GITHUB_BRANCH}`,
    { cache: 'no-store' },
  )
  if (listRes.status === 404) return [] // no posts directory on GitHub yet
  if (!listRes.ok) {
    throw new Error(`GitHub contents request failed: ${listRes.status}`)
  }
  const entries = (await listRes.json()) as { name: string }[]
  const files = entries.filter((entry) => entry.name.endsWith('.md'))

  const results = await Promise.all(
    files.map(async (file): Promise<Post | null> => {
      try {
        // 'no-store' guarantees a fresh 200 with a body (avoids 304 responses
        // whose body fetch() can fail to materialize).
        const raw = await (await fetch(rawUrl(`${POSTS_DIR}/${file.name}`), { cache: 'no-store' })).text()
        const { data, content } = matter(raw)
        const slug = file.name.replace(/\.md$/, '')
        return {
          slug,
          title: String(data.title ?? slug),
          date: new Date(data.date ? String(data.date) : 0).toISOString(),
          featuredImage: data.featured_image ? resolveMedia(String(data.featured_image)) : null,
          excerpt: data.excerpt ? String(data.excerpt) : stripMarkdown(content),
          content,
        }
      } catch (err) {
        // A single unparseable post shouldn't blank the whole list.
        console.error(`Failed to load post ${file.name}:`, err)
        return null
      }
    }),
  )
  const posts = results.filter((post): post is Post => post !== null)
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// Module-scoped cache: the homepage and /posts share one fetch, and React
// StrictMode's double effect reuses the same promise instead of fetching twice.
let cache: Promise<Post[]> | null = null
export function getPosts(): Promise<Post[]> {
  cache ??= fetchPosts().catch((err) => {
    // A failed fetch must not poison the cache forever — clear it so the next
    // call retries instead of reusing a rejected promise.
    cache = null
    throw err
  })
  return cache
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [status, setStatus] = useState<PostsStatus>('loading')

  useEffect(() => {
    let alive = true
    getPosts()
      .then((result) => {
        if (!alive) return
        setPosts(result)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('Failed to load posts:', err)
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  return { status, posts }
}
