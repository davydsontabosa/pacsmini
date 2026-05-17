import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { useConnectionStore } from './store/connectionStore'
import { useServerStore } from './store/serverStore'
import './index.css'

// Seed stores from env vars on first load (when localStorage is empty / fresh install)
const _conn = useConnectionStore.getState()
if (!_conn.host && import.meta.env.VITE_DCM4CHEE_HOST) {
  useConnectionStore.setState({
    host:        import.meta.env.VITE_DCM4CHEE_HOST,
    port:        import.meta.env.VITE_DCM4CHEE_PORT ?? '8080',
    aet:         import.meta.env.VITE_DCM4CHEE_AET  ?? 'DCM4CHEE',
    isConnected: true,
  })
}
const _srv = useServerStore.getState()
if (!_srv.apiSecret && import.meta.env.VITE_API_SECRET) {
  useServerStore.setState({
    serverUrl:    import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3500',
    apiSecret:    import.meta.env.VITE_API_SECRET,
    isConfigured: true,
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
