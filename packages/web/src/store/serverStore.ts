import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ServerState {
  serverUrl:    string
  apiSecret:    string
  isConfigured: boolean
  setServer:    (url: string, secret: string) => void
}

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      serverUrl:    import.meta.env.VITE_SERVER_URL ?? '',
      apiSecret:    import.meta.env.VITE_API_SECRET ?? '',
      isConfigured: !!(import.meta.env.VITE_API_SECRET),
      setServer:    (serverUrl, apiSecret) =>
        set({ serverUrl, apiSecret, isConfigured: !!apiSecret }),
    }),
    {
      name:    'pacs-server-config',
      version: 1,
      migrate: (s) => s as ServerState,
      partialize: (s) => ({ serverUrl: s.serverUrl, apiSecret: s.apiSecret, isConfigured: s.isConfigured }),
    }
  )
)
