import { useState, useEffect } from 'react'
import { X, Stethoscope, Check } from 'lucide-react'
import { useCreateDoctor, useUpdateDoctor } from '../../hooks/useDoctors'
import { Doctor } from '../../services/doctors'
import { cn } from '../../lib/utils'

const ALL_MODALITIES = ['CT','MR','US','PR','PT','NM','DX','CR','XA','RF','MG','OT','SC']

interface Props {
  open:    boolean
  doctor?: Doctor | null
  onClose: () => void
}

export function DoctorFormModal({ open, doctor, onClose }: Props) {
  const isEdit = !!doctor
  const create = useCreateDoctor()
  const update = useUpdateDoctor()

  const [name,           setName]           = useState('')
  const [crm,            setCrm]            = useState('')
  const [email,          setEmail]          = useState('')
  const [phone,          setPhone]          = useState('')
  const [specialization, setSpecialization] = useState('')
  const [modalities,     setModalities]     = useState<string[]>([])
  const [isActive,       setIsActive]       = useState(true)
  const [errors,         setErrors]         = useState<Record<string, string>>({})
  const [saved,          setSaved]          = useState(false)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    setErrors({})
    if (doctor) {
      setName(doctor.name)
      setCrm(doctor.crm)
      setEmail(doctor.email)
      setPhone(doctor.phone)
      setSpecialization(doctor.specialization)
      setModalities(doctor.modalities)
      setIsActive(doctor.isActive)
    } else {
      setName('')
      setCrm('')
      setEmail('')
      setPhone('')
      setSpecialization('')
      setModalities([])
      setIsActive(true)
    }
  }, [open, doctor])

  if (!open) return null

  function toggleModality(mod: string) {
    setModalities(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name = 'Nome obrigatório'
    if (!crm.trim())   e.crm  = 'CRM obrigatório'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const data = {
      name: name.trim(),
      crm:  crm.trim().toUpperCase(),
      email, phone, specialization,
      modalities,
      isActive,
    }

    try {
      if (isEdit && doctor) {
        await update.mutateAsync({ id: doctor.id, data })
      } else {
        await create.mutateAsync(data)
      }
      setSaved(true)
      setTimeout(onClose, 900)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (msg?.includes('CRM')) setErrors({ crm: 'CRM já cadastrado' })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-s1 border border-bd rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bd">
          <div className="flex items-center gap-2.5">
            <Stethoscope size={18} className="text-ac" />
            <h2 className="font-semibold text-tx">{isEdit ? 'Editar Médico' : 'Novo Médico'}</h2>
          </div>
          <button onClick={onClose} className="text-mt hover:text-tx transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs text-mt mb-1.5">Nome completo *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Dr. João da Silva"
              className={cn(
                'w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none transition-colors',
                errors.name ? 'border-er' : 'border-bd',
              )}
            />
            {errors.name && <p className="text-er text-xs mt-1">{errors.name}</p>}
          </div>

          {/* CRM */}
          <div>
            <label className="block text-xs text-mt mb-1.5">CRM *</label>
            <input value={crm} onChange={e => setCrm(e.target.value.toUpperCase())}
              placeholder="SP-123456"
              className={cn(
                'w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none font-mono transition-colors',
                errors.crm ? 'border-er' : 'border-bd',
              )}
            />
            {errors.crm && <p className="text-er text-xs mt-1">{errors.crm}</p>}
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-xs text-mt mb-1.5">Especialidade</label>
            <input value={specialization} onChange={e => setSpecialization(e.target.value)}
              placeholder="Radiologia, Cardiologia..."
              className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
            />
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-mt mb-1.5">E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="medico@hospital.com"
                className={cn(
                  'w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none transition-colors',
                  errors.email ? 'border-er' : 'border-bd',
                )}
              />
              {errors.email && <p className="text-er text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs text-mt mb-1.5">Telefone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 9xxxx-xxxx"
                className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
              />
            </div>
          </div>

          {/* Modalities */}
          <div>
            <label className="block text-xs text-mt mb-2">Modalidades atendidas</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MODALITIES.map(mod => {
                const selected = modalities.includes(mod)
                return (
                  <button key={mod} type="button" onClick={() => toggleModality(mod)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all border',
                      selected
                        ? 'bg-ac text-bg border-ac'
                        : 'bg-s2 text-mt border-bd hover:border-ac hover:text-tx',
                    )}
                  >
                    {mod}
                  </button>
                )
              })}
            </div>
            {modalities.length === 0 && (
              <p className="text-mt text-xs mt-1.5">Nenhuma modalidade selecionada</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-tx">Médico ativo</span>
            <button type="button" onClick={() => setIsActive(v => !v)}
              className={cn(
                'w-10 h-5.5 rounded-full transition-colors relative',
                isActive ? 'bg-ac' : 'bg-bd',
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                isActive ? 'left-[22px]' : 'left-0.5',
              )} />
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-mt hover:text-tx border border-bd rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || saved}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                saved
                  ? 'bg-ok text-bg'
                  : 'bg-ac hover:bg-ac2 text-bg disabled:opacity-60',
              )}
            >
              {saved ? <><Check size={14} /> Salvo!</> : isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
