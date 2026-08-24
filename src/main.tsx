import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { consumeAuthToken, getToken, refreshAuth } from './hooks/auth'
import { queryClient } from './hooks/queryClient'

// OAuth callback handling, before first render: store any ?auth_token= from the
// Google callback, strip the query from the URL (history.replaceState), and
// validate a stored session. wouter then mounts on the sanitized `next` path.
consumeAuthToken()
if (getToken()) void refreshAuth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)