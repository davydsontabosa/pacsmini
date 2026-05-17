import { useState } from 'react'
import { Plus, Server, Wifi, WifiOff, Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import { useDestinations, useDeleteDestination, useTestEcho } from '../hooks/useDestinations'
import { DicomDestination } from '../services/destinations'
import { DestinationFormModal } from '../components/shared/DestinationFormModal'
import { cn } from '../lib/utils'

function echoStatus(dest: DicomDestination): 'ok' | 'warn' | 'error' | 'never' {
  if (!dest.lastEchoAt) return 'never'
  const ageH = (Date.now() - new Date(dest.lastEchoAt).getTime()) / 3600000
  if (!dest.lastEchoOk) return 'error'
  if (ageH > 24)        return 'warn'
  return 'ok'
}

function StatusDot({ dest }: { dest: DicomDestination }) {
  const s = echoStatus(dest)
  return (
    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', {
      'bg-ok':    s === 'ok',
      'bg-wn':    s === 'warn',
      'bg-er':    s === 'error',
      'bg-mt/60': s === 'never',
    })} title={{
      ok: 'C-ECHO OK', warn: 'Echo antigo (>24h)', error: 'Último echo falhou', never: 'Nunca testado'
    }[s]} />
  )
}

function echoLabel(dest: DicomDestination): string {
  if (!dest.lastEchoAt) return 'Nunca testado'
  const ageH = (Date.now() - new Date(dest.lastEchoAt).getTime()) / 3600000
  if (ageH < 1) return `há ${Math.round(ageH * 60)}min`
  if (ageH < 24) return `há ${Math.round(ageH)}h`
  return `há ${Math.round(ageH / 24)}d`
}

function DestCard({ dest, onEdit, onDelete }: {
  dest: DicomDestination
  onEdit:   (d: DicomDestination) => void
  onDelete: (d: DicomDestination) => void
}) {
  const echoMut  = useTestEcho()
  const [echoMsg, setEchoMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleEcho() {
    setEchoMsg(null)
    try {
      const res = await echoMut.mutateAsync(dest.id)
      setEchoMsg({ text: res.message, ok: res.success })
      setTimeout(() => setEchoMsg(null), 4000)
    } catch (e) {
      setEchoMsg({ text: (e as Error).message, ok: false })
      setTimeout(() => setEchoMsg(null), 4000)
    }
  }

  const status = echoStatus(dest)

  return (
    <div className="bg-s1 border border-bd rounded-xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusDot dest={dest} />
          <span className="font-semibold text-tx text-sm">{dest.name}</span>
        </div>
        <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded',
          dest.isActive ? 'bg-ok/10 text-ok' : 'bg-mt/20 text-mt')}>
          {dest.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* AE + address */}
      <div className="space-y-1 text-xs text-mt font-mono">
        <div><span className="text-mt/60">AE Title: </span><span className="text-tx">{dest.aeTitle}</span></div>
        <div><span className="text-mt/60">Endereço: </span><span className="text-tx">{dest.host} : {dest.port}</span></div>
      </div>

      {/* Description */}
      {dest.description && (
        <p className="text-xs text-mt line-clamp-2">{dest.description}</p>
      )}

      {/* Echo label */}
      <div className="flex items-center gap-1.5 text-xs text-mt">
        {status === 'ok'    && <><Check size={11} className="text-ok" /> Último C-ECHO: {echoLabel(dest)}</>}
        {status === 'warn'  && <><Wifi  size={11} className="text-wn" /> Último C-ECHO: {echoLabel(dest)}</>}
        {status === 'error' && <><WifiOff size={11} className="text-er" /> Echo falhou: {echoLabel(dest)}</>}
        {status === 'never' && <>Nunca testado</>}
      </div>

      {/* Echo result message */}
      {echoMsg && (
        <p className={cn('text-xs rounded px-2 py-1', echoMsg.ok ? 'bg-ok/10 text-ok' : 'bg-er/10 text-er')}>
          {echoMsg.text}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-bd/50">
        <button onClick={() => void handleEcho()} disabled={echoMut.isPending}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            echoMut.isPending
              ? 'border-bd text-mt'
              : echoMsg?.ok
              ? 'border-ok/40 text-ok bg-ok/10'
              : echoMsg && !echoMsg.ok
              ? 'border-er/40 text-er bg-er/10'
              : 'border-bd text-mt hover:text-tx hover:border-ac'
          )}>
          {echoMut.isPending
            ? <><Loader2 size={11} className="animate-spin" /> Testando…</>
            : <><Wifi size={11} /> Testar Echo</>
          }
        </button>
        <button onClick={() => onEdit(dest)}
          className="flex items-center gap-1 px-3 py-1.5 border border-bd rounded-lg text-xs text-mt hover:text-tx hover:border-ac transition-colors">
          <Pencil size={11} /> Editar
        </button>
        <button onClick={() => onDelete(dest)}
          className="flex items-center gap-1 px-3 py-1.5 border border-bd rounded-lg text-xs text-mt hover:text-er hover:border-er transition-colors ml-auto">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

export default function Destinations() {
  const { data: destinations = [], isLoading } = useDestinations()
  const deleteMut = useDeleteDestination()

  const [formOpen,    setFormOpen]    = useState(false)
  const [editTarget,  setEditTarget]  = useState<DicomDestination | undefined>()
  const [confirmDel,  setConfirmDel]  = useState<DicomDestination | null>(null)

  function handleEdit(d: DicomDestination) {
    setEditTarget(d)
    setFormOpen(true)
  }

  function handleNew() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!confirmDel) return
    await deleteMut.mutateAsync(confirmDel.id)
    setConfirmDel(null)
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-tx">Destinos DICOM</h1>
          <p className="text-mt text-sm mt-0.5">Servidores externos para envio de exames</p>
        </div>
        <button onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
          <Plus size={14} /> Novo Destino
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16 text-mt">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />Carregando…
        </div>
      )}

      {/* Empty */}
      {!isLoading && destinations.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <Server size={36} className="mx-auto text-mt/40" />
          <p className="text-tx font-medium">Nenhum destino cadastrado</p>
          <p className="text-mt text-sm">Cadastre o primeiro servidor DICOM para começar a enviar exames.</p>
          <button onClick={handleNew}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors mx-auto">
            <Plus size={14} /> Cadastrar Primeiro Destino
          </button>
        </div>
      )}

      {/* Cards grid */}
      {destinations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {destinations.map(d => (
            <DestCard key={d.id} dest={d} onEdit={handleEdit} onDelete={setConfirmDel} />
          ))}
        </div>
      )}

      {/* Form modal */}
      <DestinationFormModal
        open={formOpen}
        destination={editTarget}
        onClose={() => setFormOpen(false)}
      />

      {/* Confirm delete dialog */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-s1 border border-bd rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-er shrink-0" />
              <div>
                <p className="font-semibold text-tx text-sm">Excluir destino?</p>
                <p className="text-mt text-xs mt-0.5">"{confirmDel.name}" será removido permanentemente.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors flex items-center gap-1">
                <X size={13} /> Cancelar
              </button>
              <button onClick={() => void handleDelete()} disabled={deleteMut.isPending}
                className="px-4 py-2 bg-er hover:bg-er/80 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1">
                {deleteMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
