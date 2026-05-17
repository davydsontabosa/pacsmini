import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw } from 'lucide-react'
import { getMwlItems, MwlItem } from '../services/dicomweb'
import { useConnectionStore } from '../store/connectionStore'
import { formatDicomDate } from '../lib/utils'
import { format } from 'date-fns'

export default function Worklist() {
  const { isConnected } = useConnectionStore()
  const today = format(new Date(), 'yyyyMMdd')
  const [scheduledDate, setScheduledDate] = useState(today)
  const [modality,      setModality]      = useState('')
  const [patientName,   setPatientName]   = useState('')
  const [searchParams,  setSearchParams]  = useState({ scheduledDate: today, modality: '', patientName: '' })

  const { data: items, isLoading, refetch } = useQuery<MwlItem[]>({
    queryKey: ['mwl', searchParams],
    queryFn:  () => getMwlItems(searchParams),
    enabled:  isConnected,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({ scheduledDate, modality, patientName })
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-mt text-xs mb-1">Data agendada</label>
          <input type="date" value={scheduledDate ? `${scheduledDate.slice(0,4)}-${scheduledDate.slice(4,6)}-${scheduledDate.slice(6,8)}` : ''}
            onChange={e => setScheduledDate(e.target.value.replace(/-/g, ''))}
            className="bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none" />
        </div>
        <div>
          <label className="block text-mt text-xs mb-1">Modalidade</label>
          <input value={modality} onChange={e => setModality(e.target.value)} placeholder="CT, MR..."
            className="bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none w-28" />
        </div>
        <div>
          <label className="block text-mt text-xs mb-1">Paciente</label>
          <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Nome..."
            className="bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none" />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
            <Search size={14} /> Pesquisar
          </button>
          <button type="button" onClick={() => void refetch()}
            className="p-2 bg-s1 border border-bd rounded-lg text-mt hover:text-tx transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </form>

      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bd">
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">Paciente</th>
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">ID</th>
              <th className="text-left px-4 py-3 text-mt text-xs font-medium">Data</th>
              <th className="text-left px-4 py-3 text-mt text-xs font-medium">Hora</th>
              <th className="text-left px-4 py-3 text-mt text-xs font-medium">Mod.</th>
              <th className="text-left px-4 py-3 text-mt text-xs font-medium">Procedimento</th>
              <th className="text-left px-4 py-3 text-mt text-xs font-medium">Acesso</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-5 py-8 text-center text-mt">Carregando...</td></tr>}
            {items?.map((item) => (
              <tr key={`${item.patientID}-${item.scheduledProcedureStep}-${item.scheduledDate}`} className="border-b border-bd/50 hover:bg-s2/50 transition-colors">
                <td className="px-5 py-3 text-tx">{item.patientName || '—'}</td>
                <td className="px-5 py-3 text-mt font-mono text-xs">{item.patientID}</td>
                <td className="px-4 py-3 text-mt font-mono text-xs">{formatDicomDate(item.scheduledDate)}</td>
                <td className="px-4 py-3 text-mt font-mono text-xs">{item.scheduledTime?.slice(0, 4).replace(/(.{2})/, '$1:') || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-ac/10 text-ac rounded text-xs">{item.modality || '—'}</span>
                </td>
                <td className="px-4 py-3 text-mt text-xs">{item.requestedProcedure || '—'}</td>
                <td className="px-4 py-3 text-mt font-mono text-xs">{item.accessionNumber || '—'}</td>
              </tr>
            ))}
            {!isLoading && !items?.length && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-mt">
                {isConnected ? 'Nenhum item na worklist para os filtros selecionados.' : 'Configure a conexão nas Configurações.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
