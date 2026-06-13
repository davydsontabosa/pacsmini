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

export async function downloadWithAuth(path: string, filename: string): Promise<void> {
  const { serverUrl, apiSecret } = useServerStore.getState()
  const url = `${serverUrl}${path}`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiSecret}` } })
    if (!res.ok) {
      const msg = await res.text().catch(() => '')
      alert(`Erro ao baixar arquivo: ${res.status}${msg ? ' — ' + msg.slice(0, 120) : ''}`)
      return
    }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  } catch (err) {
    alert(`Falha na conexão ao baixar: ${(err as Error).message}`)
  }
}

export function formatDicomDate(d: string | null | undefined): string {
  if (!d || d.length !== 8) return d ?? '—'
  try {
    return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
  } catch { return d }
}
