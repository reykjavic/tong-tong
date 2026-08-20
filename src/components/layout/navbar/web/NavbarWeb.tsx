import { Box } from '@mui/material'
import { useAuth } from '../../../../hooks/auth'
import type { NavbarLink } from '../shared'
import LanguageSelector from '../LanguageSelector'
import LoggedInAs from '../LoggedInAs'
import LoginButton from '../LoginButton'
import NavbarButton from './NavbarButton'

interface NavbarWebProps {
  links: NavbarLink[]
}

// Desktop navbar: nav links, the auth cluster (profile chip + login/logout
// pill) and the language dropdown, all in the toolbar row. Rendered by Navbar
// when the viewport is >= sm — the mobile drawer lives in mobile/NavbarMobile.
export default function NavbarWeb({ links }: NavbarWebProps) {
  const auth = useAuth()
  // A stored session shows the user chip even while it's still validating
  // (status 'loading'); the authoritative check lives in the Dashboard.
  const isAuthed = auth.status !== 'anonymous'

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {links.map((link) => (
          <NavbarButton key={link.href} link={link} />
        ))}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 0.75 }}>
        {/* Auth / user — outside the links array so the ordering toggle-gating
            never hides it. Signed-in users see their profile (avatar + name,
            linking to the dashboard for admins only) plus the auth action;
            anonymous visitors just get the auth action (LoginButton switches
            between Anmelden and Abmelden based on the auth state). */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {isAuthed && <LoggedInAs variant="toolbar" />}
          <LoginButton variant="toolbar" />
        </Box>
        <LanguageSelector />
      </Box>
    </>
  )
}
