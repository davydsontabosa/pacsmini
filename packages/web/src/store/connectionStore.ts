import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConnectionState {
  host:          string
  port:          string
  aet:           string
  isConnected:   boolean
  serverVersion: string | null
  setConnection: (host: string, port: string, aet: string) => void
  setConnected:  (v: boolean, version?: string) => void
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      host:          import.meta.env.VITE_DCM4CHEE_HOST ?? '',
      port:          import.meta.env.VITE_DCM4CHEE_PORT ?? '8080',
      aet:           import.meta.env.VITE_DCM4CHEE_AET  ?? 'DCM4CHEE',
      isConnected:   !!(import.meta.env.VITE_DCM4CHEE_HOST),
      serverVersion: null,
      setConnection: (host, port, aet) => set({ host, port, aet }),
      setConnected:  (isConnected, serverVersion) =>
        set({ isConnected, serverVersion: serverVersion ?? null }),
    }),
    {
      name:    'pacs-connection',
      version: 1,
      migrate: (s) => s as ConnectionState,
      partialize: (s) => ({ host: s.host, port: s.port, aet: s.aet, isConnected: s.isConnected }),
    }
  )
)

export function buildBaseUrl(host: string, port: string): string {
  if (!host) return ''
  const base = host.startsWith('http') ? host : `http://${host}`
  const clean = base.replace(/:\d+$/, '')
  return port ? `${clean}:${port}` : clean
}
