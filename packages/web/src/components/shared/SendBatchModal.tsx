import { useState } from 'react'
import { X, Send, Loader2, Check, AlertCircle, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDestinations } from '../../hooks/useDestinations'
import { sendStudy } from '../../services/send'
import { DicomStudy } from '../../services/dicomweb'
import { DicomDestination } from '../../services/destinations'
import { formatDicomDate, cn } from '../../lib/utils'

function EchoIndicator({ dest }: { dest: DicomDestination }) {
  const echoAge = dest.lastEchoAt ? (Date.now() - new Date(dest.lastEchoAt).getTime()) / 3600000 : null
  if (!dest.lastEchoAt)               return <span className="w-2 h-2 rounded-full bg-mt inline-block" />
  if (!dest.lastEchoOk)               return <span className="w-2 h-2 rounded-full bg-er inline-block" />
  if (echoAge !== null && echoAge > 24) return <span className="w-2 h-2 rounded-full bg-wn inline-block" />
  return <span className="w-2 h-2 rounded-full bg-ok inline-block" />
}

interface SendBatchModalProps {
  open:     boolean
  studies:  DicomStudy[]
  onClose:  () => void
}

export function SendBatchModal({ open, studies, onClose }: SendBatchModalProps) {
  const navigate = useNavigate()
  const { data: destinations = [] } = useDestinations()
  const [selectedId,  setSelectedId]  = useState<number | null>(null)
  const [sending,     setSending]     = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [done,        setDone]        = useState(false)
  const [errors,      setErrors]      = useState<string[]>([])

  const active = destinations.filter(d => d.isActive)

  async function handleSend() {
    if (!selectedId || sending) return
    setSending(true)
    setProgress(0)
    setErrors([])
    const errs: string[] = []

    for (let i = 0; i < studies.length; i++) {
      try {
        const res = await sendStudy(studies[i].studyInstanceUID, selectedId)
        if (!res.success) errs.push(`${studies[i].patientName}: ${res.message}`)
      } catch (e) {
        errs.push(`${studies[i].patientName}: ${(e as Error).message}`)
      }
      setProgress(i + 1)
    }

    setErrors(errs)
    setSending(false)
    setDone(true)
  }

  function handleClose() {
    setSelectedId(null)
    setSending(false)
    setProgress(0)
    setDone(false)
    setErrors([])
    onClose()
  }

  if (!open) return null

  const pct    = studies.length ? Math.round((progress / studies.length) * 100) : 0
  const destName = active.find(d => d.id === selectedId)?.aeTitle ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-s1 border border-bd rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2 text-tx font-semibold">
            <Send size={16} className="text-ac" />
            Enviar {studies.length} estudo(s) via DICOM
          </div>
          <button onClick={handleClose} className="text-mt hover:text-tx transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Study list */}
          <div className="bg-s2 border border-bd rounded-lg p-3 max-h-36 overflow-y-auto space-y-1">
            {studies.map(s => (
              <div key={s.studyInstanceUID} className="text-xs text-mt flex gap-2">
                <span className="text-ac font-mono">{s.modality || '—'}</span>
                <span className="text-tx">{s.patientName || '—'}</span>
                <span className="ml-auto font-mono">{formatDicomDate(s.studyDate)}</span>
              </div>
            ))}
          </div>

          {/* Sending progress */}
          {sending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-mt">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-ac" />
                  Enviando estudos ({progress}/{studies.length})...
                </span>
                <span className="font-mono text-ac">{pct}%</span>
              </div>
              <div className="h-2 bg-s2 rounded-full overflow-hidden">
                <div className="h-full bg-ac rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className={cn(
              'rounded-lg px-4 py-3 flex items-start gap-2 text-sm',
              errors.length === 0
                ? 'bg-ok/10 border border-ok/30 text-ok'
                : 'bg-wn/10 border border-wn/30 text-wn'
            )}>
              {errors.length === 0
                ? <><Check size={14} className="mt-0.5 shrink-0" /><span>{studies.length} estudo(s) enfileirado(s) para <strong>{destName}</strong></span></>
                : <><AlertCircle size={14} className="mt-0.5 shrink-0" /><div><p>{studies.length - errors.length} enviado(s), {errors.length} com erro</p>{errors.map((e, i) => <p key={i} className="text-xs mt-0.5 opacity-80">{e}</p>)}</div></>
              }
            </div>
          )}

          {/* Destination selector */}
          {!sending && !done && (
            <>
              <p className="text-xs text-mt uppercase tracking-wide">Selecione o servidor de destino:</p>
              {active.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-mt text-sm">Nenhum servidor cadastrado</p>
                  <button onClick={() => { onClose(); navigate('/destinations') }}
                    className="mt-2 text-xs text-ac hover:underline flex items-center gap-1 mx-auto">
                    <Plus size={11} /> Cadastrar destino DICOM
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {active.map(d => (
                    <label key={d.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedId === d.id ? 'border-ac bg-ac/10' : 'border-bd hover:border-ac/50 hover:bg-s2'
                      )}>
                      <input type="radio" name="batch-dest" value={d.id}
                        checked={selectedId === d.id} onChange={() => setSelectedId(d.id)} className="accent-ac" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-tx">{d.name}</span>
                          <EchoIndicator dest={d} />
                        </div>
                        <p className="text-xs text-mt font-mono mt-0.5">{d.aeTitle} · {d.host}:{d.port}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bd">
          <button onClick={handleClose}
            className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">
            {done ? 'Fechar' : 'Cancelar'}
          </button>
          {!done && (
            <button onClick={() => void handleSend()}
              disabled={sending || !selectedId}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              {sending
                ? <><Loader2 size={14} className="animate-spin" /> Enviando…</>
                : <><Send size={14} /> Enviar {studies.length} Estudos</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
