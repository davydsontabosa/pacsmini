import { useQuery } from '@tanstack/react-query'
import { getDiskStatus } from '../../services/serverApi'
import { HardDrive, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useServerStore } from '../../store/serverStore'

export function DiskStatusCard() {
  const { isConfigured } = useServerStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['disk-status'],
    queryFn:  getDiskStatus,
    refetchInterval: 60_000,
    retry: 1,
    enabled: isConfigured,
  })

  const statusColors = {
    ok:       'border-ok/30  bg-ok/5  text-ok',
    warning:  'border-wn/30  bg-wn/5  text-wn',
    critical: 'border-er/30  bg-er/5  text-er',
  }
  const barColors = {
    ok:       'bg-ok',
    warning:  'bg-wn',
    critical: 'bg-er',
  }

  if (!isConfigured) {
    return (
      <div className="bg-s1 border border-bd rounded-xl p-5">
        <div className="flex items-center gap-2 text-mt text-sm">
          <HardDrive size={14} />
          <span>Storage — configure o servidor PACS Mini nas Configurações</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-s1 border border-bd rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-s2 rounded w-32 mb-3" />
        <div className="h-2 bg-s2 rounded w-full mb-2" />
        <div className="h-3 bg-s2 rounded w-48" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-s1 border border-er/20 rounded-xl p-5">
        <div className="flex items-center gap-2 text-er text-sm">
          <AlertTriangle size={14} />
          <span>Falha ao carregar status do disco</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-s1 border rounded-xl p-5', statusColors[data.status])}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive size={14} />
          <span className="text-sm font-semibold">Storage DICOM</span>
        </div>
        <span className="font-mono text-lg font-bold">{data.usedPercent}%</span>
      </div>
      <div className="h-2 bg-bd rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all', barColors[data.status])}
          style={{ width: `${data.usedPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-mt font-mono">
        <span>Usado: {data.usedHuman}</span>
        <span>Livre: {data.freeHuman}</span>
        <span>Total: {data.totalHuman}</span>
      </div>
      {data.status !== 'ok' && (
        <p className="text-xs mt-2 font-medium">
          {data.status === 'critical'
            ? '⛔ Espaço crítico — ação necessária imediatamente'
            : '⚠ Espaço em alerta — libere espaço em breve'}
        </p>
      )}
    </div>
  )
}
