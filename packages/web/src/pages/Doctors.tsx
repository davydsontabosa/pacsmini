import { useState } from 'react'
import {
  Stethoscope, Plus, Search, Edit2, Trash2, Users,
  UserCog, Eye, EyeOff, AlertCircle,
} from 'lucide-react'
import { useDoctors, useDeleteDoctor } from '../hooks/useDoctors'
import { useDoctorStore } from '../store/doctorStore'
import { Doctor } from '../services/doctors'
import { DoctorFormModal }     from '../components/shared/DoctorFormModal'
import { AssignPatientModal }  from '../components/shared/AssignPatientModal'
import { useServerStore } from '../store/serverStore'
import { cn } from '../lib/utils'

const MODALITY_COLORS: Record<string, string> = {
  CT: 'bg-blue-500/15 text-blue-400',
  MR: 'bg-purple-500/15 text-purple-400',
  US: 'bg-cyan-500/15 text-cyan-400',
  PR: 'bg-green-500/15 text-green-400',
  PT: 'bg-yellow-500/15 text-yellow-400',
  NM: 'bg-orange-500/15 text-orange-400',
  DX: 'bg-pink-500/15 text-pink-400',
  CR: 'bg-red-500/15 text-red-400',
  XA: 'bg-indigo-500/15 text-indigo-400',
  RF: 'bg-teal-500/15 text-teal-400',
  MG: 'bg-rose-500/15 text-rose-400',
}

function ModalityBadge({ mod }: { mod: string }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-xs font-mono font-semibold',
      MODALITY_COLORS[mod] || 'bg-s2 text-mt',
    )}>
      {mod}
    </span>
  )
}

function DoctorCard({
  doctor,
  onEdit,
  onAssign,
  onDelete,
  onActivate,
  isActiveDoctorView,
}: {
  doctor:            Doctor
  onEdit:            () => void
  onAssign:          () => void
  onDelete:          () => void
  onActivate:        () => void
  isActiveDoctorView: boolean
}) {
  return (
    <div className={cn(
      'bg-s1 border rounded-xl p-5 flex flex-col gap-4 transition-all',
      isActiveDoctorView ? 'border-ac shadow-lg shadow-ac/10' : 'border-bd hover:border-bd/80',
    )}>
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            doctor.isActive ? 'bg-ac/10' : 'bg-s2',
          )}>
            <Stethoscope size={18} className={doctor.isActive ? 'text-ac' : 'text-mt'} />
          </div>
          <div>
            <p className="text-tx font-semibold text-sm leading-tight">{doctor.name}</p>
            <p className="text-mt text-xs font-mono mt-0.5">CRM {doctor.crm}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            doctor.isActive ? 'bg-ok' : 'bg-mt/40',
          )} />
          <span className="text-xs text-mt">{doctor.isActive ? 'Ativo' : 'Inativo'}</span>
        </div>
      </div>

      {/* Specialization */}
      {doctor.specialization && (
        <p className="text-xs text-mt -mt-2">{doctor.specialization}</p>
      )}

      {/* Modalities */}
      {doctor.modalities.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {doctor.modalities.map(m => <ModalityBadge key={m} mod={m} />)}
        </div>
      ) : (
        <p className="text-xs text-mt/50 italic">Sem modalidades definidas</p>
      )}

      {/* Contact */}
      {(doctor.email || doctor.phone) && (
        <div className="text-xs text-mt space-y-0.5">
          {doctor.email && <p>✉ {doctor.email}</p>}
          {doctor.phone && <p>✆ {doctor.phone}</p>}
        </div>
      )}

      {/* Patient count */}
      <div className="flex items-center gap-1.5 text-xs text-mt">
        <Users size={12} />
        <span>{doctor.patientCount ?? 0} paciente(s) atribuído(s)</span>
      </div>

      {/* Active-view banner */}
      {isActiveDoctorView && (
        <div className="bg-ac/10 border border-ac/30 rounded-lg px-3 py-2 text-xs text-ac font-medium flex items-center gap-1.5">
          <Eye size={12} /> Visualizando pacientes deste médico
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-bd/50">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-mt hover:text-tx border border-bd hover:border-ac rounded-lg transition-colors">
          <Edit2 size={11} /> Editar
        </button>
        <button onClick={onAssign}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-mt hover:text-tx border border-bd hover:border-ac rounded-lg transition-colors">
          <UserCog size={11} /> Pacientes
        </button>
        <button onClick={onActivate}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors border',
            isActiveDoctorView
              ? 'border-er/40 text-er hover:bg-er/10'
              : 'border-bd text-mt hover:text-tx hover:border-ac',
          )}>
          {isActiveDoctorView
            ? <><EyeOff size={11} /> Sair da visão</>
            : <><Eye size={11} /> Ver como médico</>
          }
        </button>
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-mt hover:text-er border border-bd hover:border-er/40 rounded-lg transition-colors ml-auto">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

export default function Doctors() {
  const { isConfigured } = useServerStore()
  const { data: doctors = [], isLoading } = useDoctors()
  const deleteMutation = useDeleteDoctor()
  const { activeDoctor, setActiveDoctor, clearDoctor } = useDoctorStore()

  const [searchText,    setSearchText]    = useState('')
  const [formOpen,      setFormOpen]      = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [assignDoctor,  setAssignDoctor]  = useState<Doctor | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Doctor | null>(null)

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(searchText.toLowerCase()) ||
    d.crm.toLowerCase().includes(searchText.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(searchText.toLowerCase()) ||
    d.modalities.some(m => m.toLowerCase().includes(searchText.toLowerCase()))
  )

  function openEdit(doctor: Doctor) {
    setEditingDoctor(doctor)
    setFormOpen(true)
  }

  function openCreate() {
    setEditingDoctor(null)
    setFormOpen(true)
  }

  function handleActivate(doctor: Doctor) {
    if (activeDoctor?.id === doctor.id) {
      clearDoctor()
    } else {
      setActiveDoctor({
        id:             doctor.id,
        name:           doctor.name,
        crm:            doctor.crm,
        specialization: doctor.specialization,
        modalities:     doctor.modalities,
      })
    }
  }

  async function handleDelete(doctor: Doctor) {
    await deleteMutation.mutateAsync(doctor.id)
    if (activeDoctor?.id === doctor.id) clearDoctor()
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-tx flex items-center gap-2.5">
            <Stethoscope size={20} className="text-ac" />
            Gestão de Médicos
          </h1>
          <p className="text-sm text-mt mt-1">
            Cadastre médicos, defina modalidades e controle o acesso a pacientes
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-xl text-sm transition-colors">
          <Plus size={15} /> Novo Médico
        </button>
      </div>

      {/* Not configured warning */}
      {!isConfigured && (
        <div className="flex items-center gap-2 text-wn text-sm bg-wn/10 border border-wn/30 rounded-xl px-4 py-3">
          <AlertCircle size={14} /> Configure o servidor backend nas Configurações para usar este módulo.
        </div>
      )}

      {/* Active doctor banner */}
      {activeDoctor && (
        <div className="flex items-center justify-between bg-ac/10 border border-ac/30 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Eye size={15} className="text-ac" />
            <div>
              <p className="text-sm font-semibold text-ac">
                Modo visualização: Dr. {activeDoctor.name}
              </p>
              <p className="text-xs text-mt">
                Pacientes e estudos filtrados para este médico
              </p>
            </div>
          </div>
          <button onClick={clearDoctor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-ac/40 text-ac hover:bg-ac/10 rounded-lg transition-colors">
            <EyeOff size={12} /> Sair
          </button>
        </div>
      )}

      {/* Search bar + stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt" />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar por nome, CRM, modalidade..."
            className="w-full bg-s1 border border-bd rounded-xl pl-9 pr-4 py-2 text-sm text-tx focus:border-ac outline-none"
          />
        </div>
        <span className="text-xs text-mt">
          {filtered.length} médico(s)
          {filtered.length !== doctors.length && ` de ${doctors.length}`}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-s1 border border-bd rounded-xl p-5 h-52 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Stethoscope size={36} className="text-mt/40 mb-3" />
          <p className="text-mt font-medium">
            {searchText ? 'Nenhum médico encontrado' : 'Nenhum médico cadastrado'}
          </p>
          <p className="text-mt text-sm mt-1">
            {searchText
              ? 'Tente outro termo de busca'
              : 'Clique em "Novo Médico" para começar'}
          </p>
          {!searchText && (
            <button onClick={openCreate}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg text-sm font-semibold rounded-xl transition-colors">
              <Plus size={14} /> Cadastrar primeiro médico
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(doctor => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              isActiveDoctorView={activeDoctor?.id === doctor.id}
              onEdit={() => openEdit(doctor)}
              onAssign={() => setAssignDoctor(doctor)}
              onDelete={() => setConfirmDelete(doctor)}
              onActivate={() => handleActivate(doctor)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <DoctorFormModal
        open={formOpen}
        doctor={editingDoctor}
        onClose={() => { setFormOpen(false); setEditingDoctor(null) }}
      />

      {/* Assign patients modal */}
      {assignDoctor && (
        <AssignPatientModal
          open
          doctor={assignDoctor}
          onClose={() => setAssignDoctor(null)}
        />
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-s1 border border-bd rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-tx mb-1">Excluir médico</h3>
            <p className="text-sm text-mt mb-5">
              Tem certeza que deseja excluir <span className="text-tx font-medium">{confirmDelete.name}</span>?
              Todas as atribuições de pacientes serão removidas.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-mt hover:text-tx border border-bd rounded-lg">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-er hover:bg-er/80 text-white rounded-lg transition-colors disabled:opacity-60">
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
