import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, AlertCircle, Send, Stethoscope, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPatients, getStudiesByPatient, DicomPatient, DicomStudy } from '../services/dicomweb'
import { useConnectionStore } from '../store/connectionStore'
import { formatDicomDate } from '../lib/utils'
import { SendDicomModal } from '../components/shared/SendDicomModal'
import { useDoctorStore } from '../store/doctorStore'
import { useDoctorPatients } from '../hooks/useDoctors'

function PatientDrawer({ patient, onClose }: { patient: DicomPatient; onClose: () => void }) {
  const { isConnected } = useConnectionStore()
  const [sendOpen, setSendOpen] = useState(false)
  const { data: studies, isLoading } = useQuery<DicomStudy[]>({
    queryKey: ['patient-studies', patient.patientID],
    queryFn:  () => getStudiesByPatient(patient.patientID),
    enabled:  isConnected,
  })

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-[520px] bg-s1 border-l border-bd flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bd">
          <h2 className="font-semibold text-tx">Histórico do Paciente</h2>
          <button onClick={onClose} className="text-mt hover:text-tx transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 border-b border-bd bg-s2/50">
          <p className="text-tx font-semibold">{patient.patientName || '—'}</p>
          <div className="flex gap-4 mt-1 text-xs text-mt">
            <span>ID: <span className="font-mono">{patient.patientID}</span></span>
            <span>Nasc: {formatDicomDate(patient.birthDate)}</span>
            <span>Sexo: {patient.sex || '—'}</span>
          </div>
          {studies && studies.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setSendOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-xs transition-colors"
              >
                <Send size={12} /> Enviar via DICOM
              </button>
            </div>
          )}
        </div>
        {sendOpen && (
          <SendDicomModal
            open={sendOpen}
            mode="patient"
            patientID={patient.patientID}
            patientName={patient.patientName}
            studiesCount={studies?.length ?? 0}
            onClose={() => setSendOpen(false)}
          />
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && <p className="text-mt text-sm">Carregando estudos...</p>}
          {studies?.map(s => (
            <div key={s.studyInstanceUID} className="bg-s2 rounded-lg p-4 border border-bd">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-ac/10 text-ac rounded text-xs">{s.modality || '—'}</span>
                <span className="text-mt text-xs font-mono">{formatDicomDate(s.studyDate)}</span>
              </div>
              <p className="text-tx text-sm mt-2">{s.studyDescription || 'Sem descrição'}</p>
              <p className="text-mt text-xs mt-1">{s.numberOfSeries} séries · {s.numberOfInstances} imagens</p>
              <a href={`/api/proxy/download/study/${s.studyInstanceUID}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 mt-2 text-xs text-ac hover:underline">
                <Send size={11} /> Download ZIP
              </a>
            </div>
          ))}
          {!isLoading && !studies?.length && <p className="text-mt text-sm">Nenhum estudo encontrado.</p>}
        </div>
      </div>
    </div>
  )
}

export default function Patients() {
  const [nameInput,   setNameInput]   = useState('')
  const [idInput,     setIdInput]     = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchParams, setSearchParams] = useState({ patientName: '', patientID: '' })
  const [selectedPatient, setSelectedPatient] = useState<DicomPatient | null>(null)
  const [sendPatient,     setSendPatient]     = useState<DicomPatient | null>(null)
  const { isConnected } = useConnectionStore()
  const { activeDoctor, clearDoctor } = useDoctorStore()

  // Load assigned patients when in doctor mode
  const { data: assignedPatients = [] } = useDoctorPatients(activeDoctor?.id ?? null)
  const assignedIds = useMemo(
    () => new Set(assignedPatients.map(a => a.patientId)),
    [assignedPatients],
  )

  const { data: patients, isLoading, error } = useQuery<DicomPatient[]>({
    queryKey: ['patients', searchParams],
    queryFn: () => getPatients({
      patientName: searchParams.patientName ? `${searchParams.patientName}*` : undefined,
      patientID:   searchParams.patientID || undefined,
    }),
    enabled: hasSearched && isConnected,
    retry: 1,
  })

  // Filter by doctor if active
  const visiblePatients = useMemo(() => {
    if (!activeDoctor || !patients) return patients
    return patients.filter(p => assignedIds.has(p.patientID))
  }, [patients, activeDoctor, assignedIds])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setHasSearched(true)
    setSearchParams({ patientName: nameInput, patientID: idInput })
  }

  return (
    <div className="space-y-5">
      {/* Doctor mode banner */}
      {activeDoctor && (
        <div className="flex items-center justify-between bg-ac/10 border border-ac/30 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Stethoscope size={15} className="text-ac" />
            <div>
              <p className="text-sm font-semibold text-ac">
                Visão: Dr. {activeDoctor.name} (CRM {activeDoctor.crm})
              </p>
              <p className="text-xs text-mt">
                Exibindo apenas pacientes atribuídos a este médico
                {assignedIds.size > 0 && ` · ${assignedIds.size} atribuído(s)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/doctors"
              className="text-xs text-ac hover:underline">
              Gerenciar
            </Link>
            <button onClick={clearDoctor}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-er/40 text-er hover:bg-er/10 rounded-lg transition-colors">
              <EyeOff size={11} /> Sair
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-3">
        <input value={nameInput} onChange={e => setNameInput(e.target.value)}
          placeholder="Nome do paciente" disabled={!isConnected}
          className="flex-1 bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none disabled:opacity-50" />
        <input value={idInput} onChange={e => setIdInput(e.target.value)}
          placeholder="ID do paciente" disabled={!isConnected}
          className="w-48 bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none disabled:opacity-50" />
        <button type="submit" disabled={!isConnected}
          className="flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
          <Search size={14} /> Pesquisar
        </button>
      </form>

      {!isConnected && (
        <div className="flex items-center gap-2 text-wn text-sm bg-wn/10 border border-wn/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} /> Configure a conexão com o dcm4chee nas Configurações.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-er text-sm bg-er/10 border border-er/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Erro: {(error as Error).message}</span>
        </div>
      )}

      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bd">
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">ID</th>
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">Nascimento</th>
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">Sexo</th>
              <th className="text-left px-5 py-3 text-mt text-xs font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-mt">Carregando...</td></tr>}
            {visiblePatients?.map(p => (
              <tr key={p.patientID} className="border-b border-bd/50 hover:bg-s2/50 cursor-pointer transition-colors"
                onClick={() => setSelectedPatient(p)}>
                <td className="px-5 py-3 text-ac hover:underline">{p.patientName || '—'}</td>
                <td className="px-5 py-3 text-mt font-mono text-xs">{p.patientID}</td>
                <td className="px-5 py-3 text-mt text-xs">{formatDicomDate(p.birthDate)}</td>
                <td className="px-5 py-3 text-mt text-xs">{p.sex || '—'}</td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setSendPatient(p)}
                    className="inline-flex items-center gap-1 text-xs text-mt hover:text-ac transition-colors"
                    title="Enviar via DICOM">
                    <Send size={13} /> Enviar
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !error && hasSearched && !visiblePatients?.length && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-mt">
                {activeDoctor && patients?.length
                  ? `Nenhum paciente encontrado atribuído a Dr. ${activeDoctor.name}`
                  : 'Nenhum paciente encontrado.'}
              </td></tr>
            )}
            {!hasSearched && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-mt">Use a barra de busca para pesquisar pacientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPatient && <PatientDrawer patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}

      {sendPatient && (
        <SendDicomModal
          open={!!sendPatient}
          mode="patient"
          patientID={sendPatient.patientID}
          patientName={sendPatient.patientName}
          onClose={() => setSendPatient(null)}
        />
      )}
    </div>
  )
}
