import { useEffect, useState } from 'react'
import { fetchPostRaw, fetchPostsList } from './api'

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
// (The post-listing + raw-file fetches themselves live in src/hooks/api.ts —
// this rawUrl only serves media paths.)
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

// Minimal YAML frontmatter parser (gray-matter depends on Node's Buffer,
// which is unavailable in the browser). Handles the scalar fields Decap
// writes for posts: title, date, featured_image, excerpt, body.
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { data: {}, content: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      let value = line.slice(idx + 1).trim()
      // strip surrounding quotes
      if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) {
        value = value.slice(1, -1)
      }
      // drop inline YAML comments (a trailing # not preceded by a space is literal)
      const hash = value.indexOf(' #')
      if (hash > 0) value = value.slice(0, hash)
      data[key] = value
    }
  }
  return { data, content: raw.slice(match[0].length) }
}

// Parse a single Decap post file into a Post. Shared by the full-list fetch
// (fetchPosts) and the homepage's latest-only fetch (fetchLatestPost).
function parsePost(fileName: string, raw: string): Post {
  const { data, content } = parseFrontmatter(raw)
  const slug = fileName.replace(/\.md$/, '')
  return {
    slug,
    title: String(data.title ?? slug),
    date: new Date(data.date ? String(data.date) : 0).toISOString(),
    featuredImage: data.featured_image ? resolveMedia(String(data.featured_image)) : null,
    excerpt: data.excerpt ? String(data.excerpt) : stripMarkdown(content),
    content,
  }
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
  // Listing + raw-file fetches live in api.ts; 404 on the directory returns
  // [] there, so an empty repo yields an empty list here.
  const files = (await fetchPostsList()).filter((name) => name.endsWith('.md'))

  const results = await Promise.all(
    files.map(async (name): Promise<Post | null> => {
      try {
        return parsePost(name, await fetchPostRaw(name))
      } catch (err) {
        // A single unparseable post shouldn't blank the whole list.
        console.error(`Failed to load post ${name}:`, err)
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

// Decap names post files `<date>-<slug>.md`, so filename order equals date
// order. The homepage only shows the newest post, so instead of fetching and
// parsing every post file we sort the listing and fetch just the newest one.
// Kept separate from the full-list cache so /posts still fetches everything.
async function fetchLatestPost(): Promise<Post | null> {
  // Decap names post files `<date>-<slug>.md`, so filename order equals date
  // order. Sort the listing and fetch just the newest one, falling back to the
  // next-newest on a broken file (mirrors fetchPosts' resilience).
  const files = (await fetchPostsList())
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

  for (const name of files) {
    try {
      return parsePost(name, await fetchPostRaw(name))
    } catch (err) {
      console.error(`Failed to load post ${name}:`, err)
    }
  }
  return null
}

let latestCache: Promise<Post | null> | null = null
export function getLatestPost(): Promise<Post | null> {
  latestCache ??= fetchLatestPost().catch((err) => {
    latestCache = null
    throw err
  })
  return latestCache
}

export function useLatestPost() {
  const [post, setPost] = useState<Post | null>(null)
  const [status, setStatus] = useState<PostsStatus>('loading')

  useEffect(() => {
    let alive = true
    getLatestPost()
      .then((result) => {
        if (!alive) return
        setPost(result)
        setStatus('ready')
      })
      .catch((err) => {
        console.error('Failed to load latest post:', err)
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  return { status, post }
}
