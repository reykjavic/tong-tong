import { Button } from '@mui/material'
import { Logout as LogoutIcon } from '@mui/icons-material'
import { useI18n } from '../../../i18n'
import { login, logout, useAuth } from '../../../hooks/auth'
import { drawerRowSx, toolbarPillSx } from './shared'

interface LoginButtonProps {
  variant: 'toolbar' | 'drawer'
  /** Extra action before the login/logout — e.g. close the mobile drawer. */
  onClick?: () => void
}

// The navbar's single auth action element: renders "Anmelden" while signed out
// and "Abmelden" while signed in. Same pill, same position — only the state
// (and the action it triggers) differs.
export default function LoginButton({ variant, onClick }: LoginButtonProps) {
  const { t } = useI18n()
  const auth = useAuth()
  const signedIn = auth.status === 'authenticated'

  const handleClick = () => {
    onClick?.()
    if (signedIn) void logout()
    else login()
  }

  // While a stored session is still validating, render nothing: the user chip
  // already signals "signed in", and a login button would be misleading.
  if (auth.status === 'loading') return null

  if (variant === 'drawer') {
    return (
      <Button
        onClick={handleClick}
        startIcon={signedIn ? <LogoutIcon sx={{ fontSize: 20 }} /> : undefined}
        sx={drawerRowSx}
      >
        {signedIn ? t('nav.logout') : t('nav.login')}
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      startIcon={signedIn ? <LogoutIcon sx={{ fontSize: 18 }} /> : undefined}
      sx={{ ...toolbarPillSx, px: signedIn ? 1.25 : 1.5, fontWeight: 600 }}
    >
      {signedIn ? t('nav.logout') : t('nav.login')}
    </Button>
  )
}
