import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDicomName(name: string | null | undefined): string {
  if (!name) return '—'
  return name.replace(/\^/g, ' ').trim() || '—'
}

export function formatDicomDate(d: string | null | undefined): string {
  if (!d || d.length !== 8) return d ?? '—'
  try {
    return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`
  } catch { return d }
}
