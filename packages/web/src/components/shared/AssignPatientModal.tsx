import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Search, UserPlus, UserMinus, Stethoscope, AlertCircle } from 'lucide-react'
import { getPatients } from '../../services/dicomweb'
import { useDoctorPatients, useAssignPatient, useUnassignPatient } from '../../hooks/useDoctors'
import { useConnectionStore } from '../../store/connectionStore'
import { Doctor } from '../../services/doctors'
import { cn } from '../../lib/utils'

interface Props {
  open:    boolean
  doctor:  Doctor
  onClose: () => void
}

export function AssignPatientModal({ open, doctor, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [searched, setSearched] = useState(false)
  const { isConnected } = useConnectionStore()

  const { data: assigned = [], isLoading: loadingAssigned } = useDoctorPatients(doctor.id)
  const assign   = useAssignPatient(doctor.id)
  const unassign = useUnassignPatient(doctor.id)

  const assignedIds = new Set(assigned.map(a => a.patientId))

  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ['assign-search', search],
    queryFn:  () => getPatients({ patientName: `${search}*` }),
    enabled:  searched && search.length >= 2 && isConnected,
  })

  if (!open) return null

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearched(true)
  }

  async function handleAssign(patientId: string, patientName: string) {
    await assign.mutateAsync({ patientId, patientName })
  }

  async function handleUnassign(patientId: string) {
    await unassign.mutateAsync(patientId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-s1 border border-bd rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bd shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-ac" />
              <h2 className="font-semibold text-tx">Pacientes Atribuídos</h2>
            </div>
            <p className="text-xs text-mt mt-0.5">
              {doctor.name} · CRM {doctor.crm}
            </p>
          </div>
          <button onClick={onClose} className="text-mt hover:text-tx transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: assigned patients */}
          <div className="flex-1 border-r border-bd flex flex-col">
            <div className="px-4 py-3 border-b border-bd">
              <p className="text-xs font-medium text-mt uppercase tracking-wide">
                Atribuídos ({assigned.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loadingAssigned && (
                <p className="text-mt text-sm text-center py-4">Carregando...</p>
              )}
              {!loadingAssigned && assigned.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-mt text-sm">Nenhum paciente atribuído.</p>
                  <p className="text-mt text-xs mt-1">Busque e atribua na lista ao lado.</p>
                </div>
              )}
              {assigned.map(a => (
                <div key={a.patientId}
                  className="flex items-center justify-between bg-s2 rounded-lg px-3 py-2.5 group">
                  <div>
                    <p className="text-sm text-tx">{a.patientName || '—'}</p>
                    <p className="text-xs text-mt font-mono">{a.patientId}</p>
                  </div>
                  <button
                    onClick={() => handleUnassign(a.patientId)}
                    disabled={unassign.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-er hover:bg-er/10 rounded-lg transition-all"
                    title="Remover atribuição"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: search + assign */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-bd">
              <p className="text-xs font-medium text-mt uppercase tracking-wide mb-2">
                Buscar paciente
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nome do paciente..."
                  disabled={!isConnected}
                  className="flex-1 bg-s2 border border-bd rounded-lg px-3 py-1.5 text-sm text-tx focus:border-ac outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={!isConnected || search.length < 2}
                  className="p-1.5 bg-ac hover:bg-ac2 text-bg rounded-lg transition-colors disabled:opacity-50">
                  <Search size={14} />
                </button>
              </form>
              {!isConnected && (
                <p className="text-xs text-wn mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Configure a conexão com o dcm4chee
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loadingSearch && (
                <p className="text-mt text-sm text-center py-4">Buscando...</p>
              )}
              {searched && !loadingSearch && searchResults?.length === 0 && (
                <p className="text-mt text-sm text-center py-4">Nenhum paciente encontrado.</p>
              )}
              {searchResults?.map(p => {
                const alreadyAssigned = assignedIds.has(p.patientID)
                return (
                  <div key={p.patientID}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2.5',
                      alreadyAssigned ? 'bg-ok/5 border border-ok/20' : 'bg-s2',
                    )}
                  >
                    <div>
                      <p className="text-sm text-tx">{p.patientName || '—'}</p>
                      <p className="text-xs text-mt font-mono">{p.patientID}</p>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-xs text-ok font-medium">✓ Atribuído</span>
                    ) : (
                      <button
                        onClick={() => handleAssign(p.patientID, p.patientName || '')}
                        disabled={assign.isPending}
                        className="p-1.5 text-ac hover:bg-ac/10 rounded-lg transition-colors"
                        title="Atribuir paciente"
                      >
                        <UserPlus size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
              {!searched && (
                <p className="text-mt text-sm text-center py-8">
                  Digite o nome do paciente e pesquise.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-bd shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-ac hover:bg-ac2 text-bg rounded-lg transition-colors">
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
