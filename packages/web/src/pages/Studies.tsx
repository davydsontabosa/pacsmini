import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Share2, Download, Copy, Send, X } from 'lucide-react'
import { getStudies, getSeries, DicomStudy, DicomSeries } from '../services/dicomweb'
import { useConnectionStore, buildBaseUrl } from '../store/connectionStore'
import { ShareModal } from '../components/shared/ShareModal'
import { SendDicomModal } from '../components/shared/SendDicomModal'
import { SendBatchModal } from '../components/shared/SendBatchModal'
import { formatDicomDate, downloadWithAuth } from '../lib/utils'
import { useServerStore } from '../store/serverStore'
import { cn } from '../lib/utils'

const MODALITIES = ['', 'CT', 'MR', 'CR', 'DX', 'US', 'PT', 'NM', 'XA']

function SeriesRow({ study }: { study: DicomStudy }) {
  const { host, port, aet } = useConnectionStore()
  // WADO-RS thumbnail endpoint — does not require an instance UID
  const rsBase = `${buildBaseUrl(host, port)}/dcm4chee-arc/aets/${aet}/rs`
  const { data: series, isLoading } = useQuery<DicomSeries[]>({
    queryKey: ['series', study.studyInstanceUID],
    queryFn:  () => getSeries(study.studyInstanceUID),
  })
  if (isLoading) return <tr><td colSpan={9} className="px-8 py-3 text-mt text-xs">Carregando séries...</td></tr>
  return (
    <>
      {series?.map(s => (
        <tr key={s.seriesInstanceUID} className="bg-s2/30 border-b border-bd/30">
          <td className="px-3 py-2" />
          <td className="px-8 py-2 text-mt text-xs font-mono">{s.seriesNumber}</td>
          <td className="px-4 py-2 text-mt text-xs">{s.modality}</td>
          <td className="px-4 py-2 text-mt text-xs" colSpan={2}>{s.seriesDescription || '—'}</td>
          <td className="px-4 py-2 text-mt text-xs font-mono">{s.numberOfInstances}</td>
          <td className="px-4 py-2" colSpan={3}>
            <img
              src={`${rsBase}/studies/${study.studyInstanceUID}/series/${s.seriesInstanceUID}/thumbnail?rows=64`}
              alt="thumb" className="h-10 w-10 object-cover rounded border border-bd bg-s2"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </td>
        </tr>
      ))}
    </>
  )
}

export default function Studies() {
  const [showFilters,      setShowFilters]      = useState(true)
  const [patientName,      setPatientName]      = useState('')
  const [patientID,        setPatientID]        = useState('')
  const [dateFrom,         setDateFrom]         = useState('')
  const [dateTo,           setDateTo]           = useState('')
  const [modality,         setModality]         = useState('')
  const [accessionNumber,  setAccessionNumber]  = useState('')
  const [studyDescription, setStudyDescription] = useState('')
  const [searchParams,     setSearchParams]     = useState({})
  const [expandedRows,     setExpandedRows]     = useState<Set<string>>(new Set())
  const [shareStudy,       setShareStudy]       = useState<DicomStudy | null>(null)
  const [sendStudy,        setSendStudy]        = useState<DicomStudy | null>(null)
  const [dropdownOpen,     setDropdownOpen]     = useState<string | null>(null)
  const [selected,         setSelected]         = useState<Set<string>>(new Set())
  const [batchOpen,        setBatchOpen]        = useState(false)
  const [downloading,      setDownloading]      = useState<string | null>(null)
  const { apiSecret } = useServerStore()

  const { data: studies, isLoading } = useQuery<DicomStudy[]>({
    queryKey: ['studies', searchParams],
    queryFn:  () => getStudies(searchParams),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams({
      patientName:      patientName ? `${patientName}*` : undefined,
      patientID:        patientID || undefined,
      studyDateFrom:    dateFrom ? dateFrom.replace(/-/g, '') : undefined,
      studyDateTo:      dateTo   ? dateTo.replace(/-/g, '')   : undefined,
      modality:         modality || undefined,
      accessionNumber:  accessionNumber || undefined,
      studyDescription: studyDescription || undefined,
    })
    setSelected(new Set())
  }

  function toggleExpand(uid: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  function toggleSelect(uid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  function toggleSelectAll() {
    if (!studies?.length) return
    if (selected.size === studies.length) setSelected(new Set())
    else setSelected(new Set(studies.map(s => s.studyInstanceUID)))
  }

  const selectedStudies = studies?.filter(s => selected.has(s.studyInstanceUID)) ?? []
  const allSelected = !!studies?.length && selected.size === studies.length

  return (
    <div className="space-y-5">
      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-ac/10 border border-ac/30 rounded-xl px-5 py-3">
          <span className="text-sm font-medium text-ac">
            ✓ {selected.size} estudo(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setBatchOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
              <Send size={13} /> Enviar Selecionados
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-mt hover:text-tx transition-colors p-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <button onClick={() => setShowFilters(f => !f)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm text-mt hover:text-tx transition-colors">
          <span className="font-medium">Filtros de Busca</span>
          {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showFilters && (
          <form onSubmit={handleSearch} className="px-5 pb-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Nome do paciente', value: patientName, setter: setPatientName, placeholder: 'Ex: Silva*' },
              { label: 'ID do paciente',   value: patientID,   setter: setPatientID },
              { label: 'Número de acesso', value: accessionNumber, setter: setAccessionNumber },
              { label: 'Descrição',        value: studyDescription, setter: setStudyDescription },
              { label: 'Data de',          value: dateFrom,    setter: setDateFrom, type: 'date' },
              { label: 'Data até',         value: dateTo,      setter: setDateTo,   type: 'date' },
            ].map(({ label, value, setter, placeholder, type }) => (
              <div key={label}>
                <label className="block text-mt text-xs mb-1">{label}</label>
                <input type={type || 'text'} value={value} onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-mt text-xs mb-1">Modalidade</label>
              <select value={modality} onChange={e => setModality(e.target.value)}
                className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none">
                {MODALITIES.map(m => <option key={m} value={m}>{m || 'Todas'}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
                <Search size={14} /> Pesquisar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div className="bg-s1 border border-bd rounded-xl">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="accent-ac rounded" />
                </th>
                <th className="text-left px-3 py-3 text-mt text-xs font-medium w-6"></th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium min-w-[320px]">Paciente</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium w-28">ID</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium w-28">Data</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium w-16">Mod.</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium min-w-[180px]">Descrição</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium w-16">Séries</th>
                <th className="text-left px-4 py-4 text-mt text-xs font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="px-5 py-8 text-center text-mt">Carregando...</td></tr>}
              {studies?.map(s => {
                const expanded   = expandedRows.has(s.studyInstanceUID)
                const isSelected = selected.has(s.studyInstanceUID)
                return (
                  <Fragment key={s.studyInstanceUID}>
                    <tr
                      className={cn(
                        'border-b border-bd/50 hover:bg-s2/50 transition-colors cursor-pointer',
                        isSelected && 'bg-ac/5'
                      )}
                      onClick={() => toggleExpand(s.studyInstanceUID)}>
                      <td className="px-3 py-5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(s.studyInstanceUID)}
                          className="accent-ac rounded" />
                      </td>
                      <td className="px-3 py-5 text-mt">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td className="px-4 py-5 text-tx font-medium">{s.patientName || '—'}</td>
                      <td className="px-4 py-5 text-mt font-mono text-xs">{s.patientId}</td>
                      <td className="px-4 py-5 text-mt font-mono text-xs">{formatDicomDate(s.studyDate)}</td>
                      <td className="px-4 py-5">
                        <span className="px-2 py-0.5 bg-ac/10 text-ac rounded text-xs">{s.modality || '—'}</span>
                      </td>
                      <td className="px-4 py-5 text-mt text-xs max-w-[180px] truncate">{s.studyDescription || '—'}</td>
                      <td className="px-4 py-5 text-mt font-mono text-xs">{s.numberOfSeries}</td>
                      <td className="px-4 py-5" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setDropdownOpen(d => d === s.studyInstanceUID ? null : s.studyInstanceUID)}
                            className="px-3 py-2 text-mt hover:text-tx hover:bg-s2 transition-colors rounded-lg border border-transparent hover:border-bd">
                            <MoreHorizontal size={18} />
                          </button>
                          {dropdownOpen === s.studyInstanceUID && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-s1 border border-bd rounded-xl shadow-2xl z-50 overflow-hidden">
                              <div className="px-4 py-2.5 border-b border-bd/60 text-[11px] text-mt uppercase tracking-wider font-medium">Ações do estudo</div>
                              <button onClick={() => { setShareStudy(s); setDropdownOpen(null) }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-tx hover:bg-s2 transition-colors">
                                <Share2 size={16} className="text-ac shrink-0" /> Compartilhar
                              </button>
                              <button onClick={() => { setSendStudy(s); setDropdownOpen(null) }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-tx hover:bg-s2 transition-colors">
                                <Send size={16} className="text-ac shrink-0" /> Enviar via DICOM
                              </button>
                              <button
                                onClick={() => {
                                  setDropdownOpen(null)
                                  setDownloading(s.studyInstanceUID)
                                  downloadWithAuth(`/api/proxy/download/study/${s.studyInstanceUID}`, `estudo_${s.studyInstanceUID.slice(-8)}.zip`)
                                    .finally(() => setDownloading(null))
                                }}
                                disabled={downloading === s.studyInstanceUID}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-tx hover:bg-s2 transition-colors disabled:opacity-50 disabled:cursor-wait">
                                <Download size={16} className="text-ac shrink-0" />
                                {downloading === s.studyInstanceUID ? 'Baixando...' : 'Download ZIP'}
                              </button>
                              <div className="border-t border-bd/60">
                              <button onClick={() => { void navigator.clipboard.writeText(s.studyInstanceUID); setDropdownOpen(null) }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-mt hover:bg-s2 hover:text-tx transition-colors">
                                <Copy size={16} className="shrink-0" /> Copiar Study UID
                              </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && <SeriesRow key={`s-${s.studyInstanceUID}`} study={s} />}
                  </Fragment>
                )
              })}
              {!isLoading && !studies?.length && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-mt">
                  Use os filtros para pesquisar estudos.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Share modal */}
      {shareStudy && (
        <ShareModal
          study={shareStudy}
          open={!!shareStudy}
          createdBy="Operador"
          onClose={() => setShareStudy(null)}
        />
      )}

      {/* Send single study modal */}
      {sendStudy && (
        <SendDicomModal
          open={!!sendStudy}
          mode="study"
          studyUID={sendStudy.studyInstanceUID}
          studyInfo={{
            patientName: sendStudy.patientName,
            studyDate:   formatDicomDate(sendStudy.studyDate),
            modality:    sendStudy.modality,
            description: sendStudy.studyDescription,
          }}
          onClose={() => setSendStudy(null)}
        />
      )}

      {/* Send batch modal */}
      <SendBatchModal
        open={batchOpen}
        studies={selectedStudies}
        onClose={() => setBatchOpen(false)}
      />
    </div>
  )
}
