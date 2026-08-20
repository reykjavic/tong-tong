import { Avatar, Box, Button, Typography } from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'
import { Link } from 'wouter'
import { useI18n } from '../../../i18n'
import { useAuth } from '../../../hooks/auth'
import { drawerRowSx, toolbarChipSx, toolbarPillSx } from './shared'

// Per-context sizing: the toolbar shows a compact chip, the mobile drawer a
// larger row.
const SIZES = {
  toolbar: { avatar: 26, label: '0.58rem', name: '0.8rem' },
  drawer: { avatar: 32, label: '0.7rem', name: '0.95rem' },
} as const

interface LoggedInAsProps {
  variant: 'toolbar' | 'drawer'
  /** Extra action on click — e.g. close the mobile drawer after navigating. */
  onNavigate?: () => void
}

// Avatar + "Angemeldet als" block. Wrapped in a dashboard link for admins,
// rendered as a plain chip for everyone else — the dashboard isn't offered to
// non-admin Google accounts, so the chip must not look clickable.
export default function LoggedInAs({ variant, onNavigate }: LoggedInAsProps) {
  const { t } = useI18n()
  const auth = useAuth()
  const displayName = auth.name || auth.email
  const avatarInitial = (displayName?.[0] ?? '').toUpperCase()
  const sizes = SIZES[variant]

  const chip = (
    <>
      <Avatar
        src={auth.picture ?? undefined}
        alt={displayName ?? t('nav.admin')}
        sx={{
          width: sizes.avatar,
          height: sizes.avatar,
          flexShrink: 0,
          fontSize: sizes.avatar / 2,
          bgcolor: 'rgba(255,255,255,0.25)',
        }}
      >
        {avatarInitial || <PersonIcon sx={{ fontSize: sizes.avatar * 0.6 }} />}
      </Avatar>
      <Box sx={{ ml: 1.5, minWidth: 0, lineHeight: 1.1, textAlign: 'left', whiteSpace: 'nowrap' }}>
        <Typography sx={{ fontSize: sizes.label, opacity: 0.85, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {t('nav.loggedInAs')}
        </Typography>
        <Typography
          sx={{
            fontSize: sizes.name,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName ?? '…'}
        </Typography>
      </Box>
    </>
  )

  if (auth.isAdmin) {
    return (
      <Button
        component={Link}
        href="/dashboard"
        onClick={onNavigate}
        title={t('nav.admin')}
        sx={variant === 'toolbar' ? { ...toolbarPillSx, px: 1 } : drawerRowSx}
      >
        {chip}
      </Button>
    )
  }

  return (
    <Box
      title={auth.email ?? undefined}
      sx={
        variant === 'toolbar'
          ? { ...toolbarChipSx, display: 'flex', alignItems: 'center', px: 1 }
          : {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              px: 1.5,
              py: 1.2,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: 2,
            }
      }
    >
      {chip}
    </Box>
  )
}
