import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useConnectionStore } from '../store/connectionStore'
import { getStudies } from '../services/dicomweb'
import { getDicomEvents } from '../services/serverApi'
import { DiskStatusCard } from '../components/shared/DiskStatusCard'
import { formatDicomDate, cn } from '../lib/utils'

function KpiCard({ label, value, sub, color = 'text-ac' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-s1 border border-bd rounded-xl p-5">
      <p className="text-mt uppercase text-[10px] tracking-widest mb-2">{label}</p>
      <p className={cn('font-mono text-[28px] font-semibold leading-none', color)}>{value}</p>
      {sub && <p className="text-mt text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { isConnected } = useConnectionStore()
  const today = format(new Date(), 'yyyyMMdd')

  const { data: allStudies } = useQuery({
    queryKey: ['studies-count'],
    queryFn: () => getStudies({ limit: 1 }),
    refetchInterval: 30_000,
    enabled: isConnected,
  })

  const { data: todayStudies } = useQuery({
    queryKey: ['studies-today'],
    queryFn: () => getStudies({ studyDateFrom: today, studyDateTo: today }),
    refetchInterval: 30_000,
    enabled: isConnected,
  })

  const { data: recentStudies } = useQuery({
    queryKey: ['studies-recent'],
    queryFn: () => getStudies({ limit: 10 }),
    refetchInterval: 30_000,
    enabled: isConnected,
  })

  const { data: events } = useQuery({
    queryKey: ['dicom-events-recent'],
    queryFn:  getDicomEvents,
    refetchInterval: 60_000,
    retry: 1,
  })

  const recentErrors = events?.slice(0, 5) ?? []

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Estudos" value={allStudies?.length ?? '—'} sub="estudos no PACS" />
        <KpiCard label="Estudos Hoje" value={todayStudies?.length ?? '—'} sub={format(new Date(), 'dd/MM/yyyy')} />
        <KpiCard
          label="Status Servidor"
          value={isConnected ? 'Online' : 'Offline'}
          color={isConnected ? 'text-ok' : 'text-er'}
          sub={isConnected ? 'conectado ao dcm4chee' : 'verifique as configurações'}
        />
        <KpiCard label="Erros DICOM" value={recentErrors.length || '0'} sub="recentes" color={recentErrors.length > 0 ? 'text-er' : 'text-ok'} />
      </div>

      {/* Storage */}
      <DiskStatusCard />

      {/* Recent DICOM Events */}
      {recentErrors.length > 0 && (
        <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-bd">
            <h2 className="font-semibold text-sm text-er">Eventos de Erro Recentes</h2>
            <button onClick={() => navigate('/events')} className="text-xs text-ac hover:underline">Ver todos</button>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {recentErrors.map(e => (
                <tr key={e.id} className="border-b border-bd/50 hover:bg-s2/50">
                  <td className="px-5 py-2 text-mt text-xs font-mono whitespace-nowrap">
                    {format(new Date(e.occurred_at), 'dd/MM HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-er/10 text-er px-2 py-0.5 rounded font-mono">{e.event_type}</span>
                  </td>
                  <td className="px-4 py-2 text-mt text-xs truncate max-w-xs">{e.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Studies */}
      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bd">
          <h2 className="font-semibold text-sm">Estudos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd">
                <th className="text-left px-5 py-3 text-mt text-xs font-medium">Paciente</th>
                <th className="text-left px-5 py-3 text-mt text-xs font-medium">Data</th>
                <th className="text-left px-5 py-3 text-mt text-xs font-medium">Modalidade</th>
                <th className="text-left px-5 py-3 text-mt text-xs font-medium">Séries</th>
              </tr>
            </thead>
            <tbody>
              {recentStudies?.map(s => (
                <tr key={s.studyInstanceUID} className="border-b border-bd/50 hover:bg-s2/50 transition-colors">
                  <td className="px-5 py-3 text-tx">{s.patientName || '—'}</td>
                  <td className="px-5 py-3 text-mt font-mono text-xs">{formatDicomDate(s.studyDate)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-ac/10 text-ac rounded text-xs">{s.modality || '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-mt font-mono text-xs">{s.numberOfSeries}</td>
                </tr>
              ))}
              {!recentStudies?.length && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-mt text-sm">
                  {isConnected ? 'Nenhum estudo encontrado' : 'Configure a conexão com o dcm4chee nas Configurações'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
