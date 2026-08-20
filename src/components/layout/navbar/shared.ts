// Shared sizing/styles for the navbar controls.

// The nav-link data shape — owned by the shell (Navbar), consumed by the
// desktop link buttons (NavbarButton).
export interface NavbarLink {
  href: string
  key: string
}

// Every right-side toolbar control (language dropdown) uses this height so
// the toolbar renders as one aligned row.
export const TOOLBAR_CONTROL_HEIGHT = 38

// Interactive toolbar pill: chip look, no text wrapping, hover highlight.
// Used by the language button. flexShrink: 0 keeps the pill at its natural
// size — the toolbar cuts off rather than squeezing pills when space runs out.
export const toolbarPillSx = {
  height: TOOLBAR_CONTROL_HEIGHT,
  borderRadius: '8px',
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.15)',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  textTransform: 'none',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
} as const
