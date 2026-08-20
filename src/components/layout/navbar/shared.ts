// Shared sizing/styles for the navbar controls.

// The nav-link data shape — owned by the shell (Navbar), consumed by both
// views' link buttons (web/NavbarButton and mobile/DrawerLink).
export interface NavbarLink {
  href: string
  key: string
}

// Every right-side toolbar control (logged-in chip, logout, language) uses this
// height so the cluster renders as one aligned row of equal-height pills.
export const TOOLBAR_CONTROL_HEIGHT = 38

// Non-interactive pill (no hover) used for the "Angemeldet als" chip — it
// carries no action for non-admin users, so it must not look clickable.
export const toolbarChipSx = {
  height: TOOLBAR_CONTROL_HEIGHT,
  borderRadius: '8px',
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.15)',
} as const

// Interactive toolbar pill: the chip look plus no text wrapping and a hover
// highlight. Used by the logout, language and login buttons.
export const toolbarPillSx = {
  ...toolbarChipSx,
  whiteSpace: 'nowrap',
  textTransform: 'none',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
} as const

// Full-width row look for the mobile drawer's buttons.
export const drawerRowSx = {
  justifyContent: 'flex-start',
  px: 1.5,
  py: 1.2,
  color: '#fff',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1rem',
  borderRadius: 2,
  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
} as const
