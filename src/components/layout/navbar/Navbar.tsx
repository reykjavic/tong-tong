import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AppBar, Box, Container, Toolbar, useMediaQuery, useTheme } from '@mui/material'
import { useLocation } from 'wouter'
import { useConfig } from '../../../hooks/config'
import Brand from './Brand'
import type { NavbarLink } from './shared'
import NavbarMobile from './mobile'
import NavbarWeb from './web'

const links: NavbarLink[] = [
  { href: '/', key: 'nav.home' },
  { href: '/about', key: 'nav.about' },
  { href: '/menu', key: 'nav.menu' },
  { href: '/order', key: 'nav.order' },
  { href: '/contact', key: 'nav.contact' },
]

// The navbar shell: the AppBar chrome plus the brand, shared by both
// viewports. Everything else is either the desktop toolbar (NavbarWeb) or the
// mobile hamburger + drawer (NavbarMobile) — they never coexist, so Navbar
// just picks one based on the viewport.
export default function Navbar() {
  const { config } = useConfig()
  const [location] = useLocation()
  const theme = useTheme()
  const visibleLinks = links.filter((link) => !(link.href === '/order' && !config.ordering.enabled))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isHome = location === '/'
  const [scrolled, setScrolled] = useState(false)
  // Measured height of the AppBar, so the fixed navbar never covers content.
  const appBarRef = useRef<HTMLDivElement>(null)
  const [navbarHeight, setNavbarHeight] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const el = appBarRef.current
    if (!el) return
    const update = () => setNavbarHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile, isHome])

  // Fixed on mobile (always) and on home page (hero overlay). Static on
  // desktop non-home pages where the navbar sits naturally in the flow.
  const transparent = isHome && !scrolled

  return (
    <>
      {/* On mobile, the navbar is fixed and out of the document flow. On non-home
          pages there is no full-screen hero underneath, so reserve its measured
          height so content isn't hidden behind the solid bar. */}
      {isMobile && !isHome && <Box aria-hidden sx={{ height: navbarHeight }} />}
      <AppBar
        ref={appBarRef}
        position={(isHome || isMobile) ? 'fixed' : 'static'}
        sx={{
          bgcolor: transparent ? 'transparent' : 'primary.main',
          boxShadow: transparent ? 'none' : undefined,
          transition: 'background-color 0.3s ease',
          // Give the fixed AppBar breathing room below the mobile status bar
          ...(isMobile && { pt: 'env(safe-area-inset-top, 8px)' }),
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Brand />
            {/* Mobile and desktop never coexist: render exactly one toolbar
                content — the desktop links/auth/language row or the mobile
                hamburger + drawer. */}
            {isMobile ? <NavbarMobile links={visibleLinks} /> : <NavbarWeb links={visibleLinks} />}
          </Toolbar>
        </Container>
      </AppBar>
    </>
  )
}
