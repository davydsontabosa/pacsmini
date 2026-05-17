import checkDiskSpace from 'check-disk-space'
import { env } from '../../config/env'

export interface DiskStatus {
  path:         string
  totalBytes:   number
  freeBytes:    number
  usedBytes:    number
  usedPercent:  number
  freePercent:  number
  status:       'ok' | 'warning' | 'critical'
  totalHuman:   string
  freeHuman:    string
  usedHuman:    string
}

function humanBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

export async function getDiskStatus(): Promise<DiskStatus> {
  const info = await checkDiskSpace(env.STORAGE_PATH)
  const usedBytes   = info.size - info.free
  const usedPercent = Math.round((usedBytes / info.size) * 100)
  const freePercent = 100 - usedPercent
  const warnPct     = parseInt(env.DISK_WARN_PERCENT, 10)
  const criticalPct = parseInt(env.DISK_CRITICAL_PERCENT, 10)

  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (usedPercent >= criticalPct) status = 'critical'
  else if (usedPercent >= warnPct) status = 'warning'

  return {
    path:       env.STORAGE_PATH,
    totalBytes: info.size,
    freeBytes:  info.free,
    usedBytes,
    usedPercent,
    freePercent,
    status,
    totalHuman: humanBytes(info.size),
    freeHuman:  humanBytes(info.free),
    usedHuman:  humanBytes(usedBytes),
  }
}
