import { QueryClient } from '@tanstack/react-query'

// Shared TanStack Query client — one per app instance (the SPA is fully
// client-side on static S3, so no SSR/hydration concerns). Defaults:
// refetchOnWindowFocus keeps long-open tabs fresh when the user returns
// (replaces the manual visibilitychange listeners), and refetchInterval
// pauses in background tabs by default.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
