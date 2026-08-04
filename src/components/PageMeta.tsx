import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useI18n } from '../i18n'

// Map each route to i18n keys for its <title> and meta description.
// Kept in sync with the routes registered in App.tsx.
const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'meta.home.title', description: 'meta.home.description' },
  '/about': { title: 'meta.about.title', description: 'meta.about.description' },
  '/menu': { title: 'meta.menu.title', description: 'meta.menu.description' },
  '/contact': { title: 'meta.contact.title', description: 'meta.contact.description' },
  '/hours': { title: 'meta.hours.title', description: 'meta.hours.description' },
  '/posts': { title: 'meta.posts.title', description: 'meta.posts.description' },
  '/impressum': { title: 'meta.impressum.title', description: 'meta.impressum.description' },
  '/datenschutz': { title: 'meta.datenschutz.title', description: 'meta.datenschutz.description' },
}

export default function PageMeta() {
  const [location] = useLocation()
  const { t } = useI18n()

  useEffect(() => {
    const meta = ROUTE_META[location] ?? ROUTE_META['/']
    document.title = t(meta.title)
    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', t(meta.description))
  }, [location, t])

  return null
}
