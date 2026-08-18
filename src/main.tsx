import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { consumeAuthToken, getToken, refreshAuth } from './hooks/auth'

// OAuth callback handling, before first render: store any ?auth_token= from the
// Google callback, strip the query from the URL (history.replaceState), and
// validate a stored session. wouter then mounts on the sanitized `next` path.
consumeAuthToken()
if (getToken()) void refreshAuth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)