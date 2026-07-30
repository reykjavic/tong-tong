import * as React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
} from '@mui/material'
import { Link } from 'wouter'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/menu', label: 'Menu' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  return (
    <AppBar position="static" sx={{ bgcolor: '#00A896' }}>
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontFamily: '"Georgia", serif',
            fontSize: '1.4rem',
            '&:hover': { color: 'white' },
          }}
        >
          Tong Tong
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {links.map((link) => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              color="inherit"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                '&[data-wouter-link-active]': {
                  borderBottom: '2px solid white',
                  fontWeight: 700,
                },
              }}
            >
              {link.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  )
}