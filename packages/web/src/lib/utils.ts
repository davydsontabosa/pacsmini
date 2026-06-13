import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useServerStore } from '../store/serverStore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDicomName(name: string | null | undefined): string {
  if (!name) return '—'
  return name.replace(/\^/g, ' ').trim() || '—'
}

export async function downloadWithAuth(path: string, filename: string) {
  const { serverUrl, apiSecret } = useServerStore.getState()
  const url = `${serverUrl}${path}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiSecret}` } })
  if (!res.ok) throw new Error(`Erro ${res.status} ao baixar arquivo`)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function formatDicomDate(d: string | null | undefined): string {
  if (!d || d.length !== 8) return d ?? '—'
  try {
    return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
  } catch { return d }
}
