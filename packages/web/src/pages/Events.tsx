import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getDicomEvents, DicomEvent } from '../services/serverApi'
import { useServerStore } from '../store/serverStore'
import { format, parseISO, subHours, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '../lib/utils'

const EVENT_COLORS: Record<string, string> = {
  export_error:    'bg-er/10 text-er',
  retrieve_error:  'bg-wn/10 text-wn',
  connection_fail: 'bg-wn/10 text-wn',
  dicom_error:     'bg-er/10 text-er',
  manual:          'bg-mt/10 text-mt',
}

const PERIODS = [
  { label: '1h',  hours: 1    },
  { label: '6h',  hours: 6    },
  { label: '24h', hours: 24   },
  { label: '7d',  hours: 24*7 },
]

export default function Events() {
  const { isConfigured } = useServerStore()
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [periodHours,     setPeriodHours]     = useState(24)

  const { data: events, isLoading, refetch, error } = useQuery({
    queryKey: ['dicom-events'],
    queryFn:  getDicomEvents,
    refetchInterval: 60_000,
    enabled: isConfigured,
    retry: 1,
  })

  const since = subHours(new Date(), periodHours)
  const filtered = (events ?? []).filter(e => {
    const inPeriod = parseISO(e.occurred_at) >= since
    const matchesType = !eventTypeFilter || e.event_type === eventTypeFilter
    return inPeriod && matchesType
  })

  const eventTypes = [...new Set((events ?? []).map(e => e.event_type))]

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-wn text-sm bg-wn/10 border border-wn/30 rounded-lg px-4 py-3">
        <AlertCircle size={14} /> Configure o Servidor PACS Mini nas Configurações.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-tx">Eventos DICOM</h1>
          {filtered.length > 0 && (
            <span className="text-xs bg-er/10 text-er px-2 py-0.5 rounded font-mono">{filtered.length} eventos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex border border-bd rounded-lg overflow-hidden">
            {PERIODS.map(p => (
              <button key={p.label} onClick={() => setPeriodHours(p.hours)}
                className={cn('px-3 py-1.5 text-xs transition-colors',
                  periodHours === p.hours ? 'bg-ac text-bg font-semibold' : 'text-mt hover:text-tx')}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
            className="bg-s1 border border-bd rounded-lg px-3 py-1.5 text-sm text-tx focus:border-ac outline-none">
            <option value="">Todos os tipos</option>
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => void refetch()}
            className="p-2 bg-s1 border border-bd rounded-lg text-mt hover:text-tx transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-er text-sm bg-er/10 border border-er/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} /> {(error as Error).message}
        </div>
      )}

      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd">
                <th className="text-left px-5 py-3 text-mt text-xs font-medium whitespace-nowrap">Horário</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">AET Origem</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Paciente</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Study UID</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Detalhe</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Notif.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-5 py-8 text-center text-mt">Carregando...</td></tr>}
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-bd/50 hover:bg-s2/50 transition-colors">
                  <td className="px-5 py-3 text-mt font-mono text-xs whitespace-nowrap">
                    {format(parseISO(e.occurred_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-xs rounded font-mono', EVENT_COLORS[e.event_type] ?? 'bg-mt/10 text-mt')}>
                      {e.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mt font-mono text-xs">{e.source_aet ?? '—'}</td>
                  <td className="px-4 py-3 text-mt text-xs">{e.patient_id ?? '—'}</td>
                  <td className="px-4 py-3 text-mt font-mono text-xs" title={e.study_uid ?? ''}>
                    {e.study_uid ? `...${e.study_uid.slice(-12)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-mt text-xs max-w-[240px] truncate" title={e.detail ?? ''}>
                    {e.detail ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {e.notified ? <CheckCircle size={13} className="text-ok mx-auto" /> : <Clock size={13} className="text-mt mx-auto" />}
                  </td>
                </tr>
              ))}
              {!isLoading && !filtered.length && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-mt">
                  Nenhum evento registrado — o sistema está operando normalmente.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
