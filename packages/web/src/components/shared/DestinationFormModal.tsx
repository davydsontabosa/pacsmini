import { useState, useEffect } from 'react'
import { X, Server } from 'lucide-react'
import { DicomDestination, CreateDestinationInput } from '../../services/destinations'
import { useCreateDestination, useUpdateDestination } from '../../hooks/useDestinations'
import { cn } from '../../lib/utils'

interface DestinationFormModalProps {
  open:         boolean
  destination?: DicomDestination
  onClose:      () => void
  onSaved?:     (dest: DicomDestination) => void
}

export function DestinationFormModal({ open, destination, onClose, onSaved }: DestinationFormModalProps) {
  const isEdit = !!destination
  const createMutation = useCreateDestination()
  const updateMutation = useUpdateDestination()

  const [name,        setName]        = useState('')
  const [aeTitle,     setAeTitle]     = useState('')
  const [host,        setHost]        = useState('')
  const [port,        setPort]        = useState('11112')
  const [description, setDescription] = useState('')
  const [isActive,    setIsActive]    = useState(true)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [success,     setSuccess]     = useState('')

  useEffect(() => {
    if (open) {
      setName(destination?.name ?? '')
      setAeTitle(destination?.aeTitle ?? '')
      setHost(destination?.host ?? '')
      setPort(String(destination?.port ?? 11112))
      setDescription(destination?.description ?? '')
      setIsActive(destination?.isActive ?? true)
      setErrors({})
      setSuccess('')
    }
  }, [open, destination])

  function handleAeTitle(v: string) {
    setAeTitle(v.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 16))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim())       errs.name    = 'Nome é obrigatório'
    if (!aeTitle.trim())    errs.aeTitle = 'AE Title é obrigatório'
    if (!host.trim())       errs.host    = 'IP / Hostname é obrigatório'
    const p = parseInt(port, 10)
    if (isNaN(p) || p < 1 || p > 65535) errs.port = 'Porta inválida (1–65535)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    const data: CreateDestinationInput = {
      name: name.trim(), aeTitle: aeTitle.trim(),
      host: host.trim(), port: parseInt(port, 10),
      description: description.trim() || undefined,
      isActive,
    }
    try {
      let saved: DicomDestination
      if (isEdit) {
        saved = await updateMutation.mutateAsync({ id: destination!.id, data })
        setSuccess('Destino atualizado com sucesso')
      } else {
        saved = await createMutation.mutateAsync(data)
        setSuccess('Destino criado com sucesso')
      }
      onSaved?.(saved)
      setTimeout(onClose, 1000)
    } catch (e) {
      setErrors({ _: (e as Error).message })
    }
  }

  if (!open) return null

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-s1 border border-bd rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2 text-tx font-semibold">
            <Server size={16} className="text-ac" />
            {isEdit ? 'Editar Destino DICOM' : 'Novo Destino DICOM'}
          </div>
          <button onClick={onClose} className="text-mt hover:text-tx transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={100}
              placeholder="ex: PACS Hospital Central"
              className={cn('w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none',
                errors.name ? 'border-er' : 'border-bd')} />
            {errors.name && <p className="text-er text-xs mt-1">{errors.name}</p>}
          </div>

          {/* AE Title */}
          <div>
            <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">
              AE Title <span className="font-mono text-ac">{aeTitle.length}/16</span>
            </label>
            <input value={aeTitle} onChange={e => handleAeTitle(e.target.value)}
              placeholder="ex: PACS-CENTRAL"
              className={cn('w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx font-mono focus:border-ac outline-none',
                errors.aeTitle ? 'border-er' : 'border-bd')} />
            {errors.aeTitle && <p className="text-er text-xs mt-1">{errors.aeTitle}</p>}
          </div>

          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">IP / Hostname</label>
              <input value={host} onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.200"
                className={cn('w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none',
                  errors.host ? 'border-er' : 'border-bd')} />
              {errors.host && <p className="text-er text-xs mt-1">{errors.host}</p>}
            </div>
            <div>
              <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Porta</label>
              <input type="number" value={port} onChange={e => setPort(e.target.value)}
                min={1} max={65535} placeholder="11112"
                className={cn('w-full bg-s2 border rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none',
                  errors.port ? 'border-er' : 'border-bd')} />
              {errors.port && <p className="text-er text-xs mt-1">{errors.port}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              maxLength={300} rows={2} placeholder="Observações..."
              className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none resize-none" />
          </div>

          {/* Ativo toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-tx">Destino ativo</label>
            <button type="button" onClick={() => setIsActive(v => !v)}
              className={cn('w-10 h-5 rounded-full transition-colors relative', isActive ? 'bg-ac' : 'bg-bd')}>
              <span className={cn('absolute top-0.5 w-4 h-4 bg-bg rounded-full transition-transform',
                isActive ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>

          {errors._ && <p className="text-er text-xs">{errors._}</p>}
          {success   && <p className="text-ok text-xs">{success}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bd">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">
            Cancelar
          </button>
          <button onClick={() => void handleSave()} disabled={isPending}
            className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
