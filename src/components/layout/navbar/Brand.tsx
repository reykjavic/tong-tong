import { Box, Typography } from '@mui/material'
import { Link } from 'wouter'

// The restaurant brand mark: the neon-green box with the "Tong Tong" script
// name over the Chinese "冬冬饭店". Always links back to the homepage. The
// wrapper follows the boilerplate's dual-flexGrow trick: on mobile it grows
// together with the hamburger's wrapper, balancing the row so the brand sits
// centered; on desktop it keeps its natural width so the page buttons sit
// right next to it (like the demo's logo + pages). It never shrinks below the
// brand's own width, so on a too-narrow viewport the toolbar overflows and
// the AppBar clips it instead of the brand bleeding into the neighbouring
// controls.
export default function Brand() {
  return (
    <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 auto' }, display: 'flex', justifyContent: 'flex-start' }}>
      <Box
        component={Link}
        href="/"
        aria-label="Tong Tong – Startseite"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textDecoration: 'none',
          borderRadius: 0.4,
          bgcolor: '#39FF14',
          px: 2.5,
          py: 1.3,
          gap: 1,
          transition: 'transform 0.2s ease',
          '&:hover': { transform: 'scale(1.05)' },
        }}
      >
        <Typography
          sx={{
            color: 'red',
            fontWeight: 700,
            fontSize: '1.5rem',
            letterSpacing: '0.02em',
            fontFamily: '"Kaushan Script", cursive',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Tong Tong
        </Typography>
        <Typography
          sx={{
            color: 'red',
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          冬冬饭店
        </Typography>
      </Box>
    </Box>
  )
}
