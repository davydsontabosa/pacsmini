import { useState } from 'react'
import { X, Send, Check, AlertCircle, Loader2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDestinations } from '../../hooks/useDestinations'
import { useSendStudy, useSendPatient } from '../../hooks/useSend'
import { DicomDestination } from '../../services/destinations'
import { cn } from '../../lib/utils'

function EchoIndicator({ dest }: { dest: DicomDestination }) {
  const now     = new Date()
  const echoAge = dest.lastEchoAt ? (now.getTime() - new Date(dest.lastEchoAt).getTime()) / 3600000 : null
  if (!dest.lastEchoAt) return <span className="w-2 h-2 rounded-full bg-mt inline-block" title="Nunca testado" />
  if (!dest.lastEchoOk) return <span className="w-2 h-2 rounded-full bg-er inline-block" title="Último echo falhou" />
  if (echoAge !== null && echoAge > 24) return <span className="w-2 h-2 rounded-full bg-wn inline-block" title="Echo antigo" />
  return <span className="w-2 h-2 rounded-full bg-ok inline-block" title="Echo OK" />
}

interface SendDicomModalProps {
  open:          boolean
  mode:          'study' | 'patient'
  studyUID?:     string
  studyInfo?:    { patientName: string; studyDate: string; modality: string; description: string }
  patientID?:    string
  patientName?:  string
  studiesCount?: number
  onClose:       () => void
}

export function SendDicomModal({
  open, mode, studyUID, studyInfo, patientID, patientName, studiesCount, onClose,
}: SendDicomModalProps) {
  const navigate = useNavigate()
  const { data: destinations = [] } = useDestinations()
  const sendStudyMut   = useSendStudy()
  const sendPatientMut = useSendPatient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result,     setResult]     = useState<{ success: boolean; message: string } | null>(null)

  const active = destinations.filter(d => d.isActive)
  const isPending = sendStudyMut.isPending || sendPatientMut.isPending

  async function handleSend() {
    if (!selectedId) return
    setResult(null)
    try {
      let res
      if (mode === 'study' && studyUID) {
        res = await sendStudyMut.mutateAsync({ studyUID, destinationId: selectedId })
      } else if (mode === 'patient' && patientID) {
        res = await sendPatientMut.mutateAsync({ patientID, destinationId: selectedId })
      } else return
      setResult({ success: res.success, message: res.message })
    } catch (e) {
      setResult({ success: false, message: (e as Error).message })
    }
  }

  function handleClose() {
    setSelectedId(null)
    setResult(null)
    onClose()
  }

  if (!open) return null

  const selectedDest = active.find(d => d.id === selectedId)
  const title = mode === 'study' ? 'Enviar Exame via DICOM' : 'Enviar Exames via DICOM'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-s1 border border-bd rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2 text-tx font-semibold">
            <Send size={16} className="text-ac" /> {title}
          </div>
          <button onClick={handleClose} className="text-mt hover:text-tx transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Study / Patient info card */}
          <div className="bg-s2 border border-bd rounded-lg p-3 text-sm">
            {mode === 'study' && studyInfo && (
              <>
                <p className="font-semibold text-tx">{studyInfo.patientName || '—'}</p>
                <p className="text-mt text-xs mt-0.5">
                  {studyInfo.modality} · {studyInfo.studyDate} · {studyInfo.description || 'Sem descrição'}
                </p>
              </>
            )}
            {mode === 'patient' && (
              <>
                <p className="font-semibold text-tx">{patientName || '—'}</p>
                {studiesCount !== undefined && (
                  <p className="text-mt text-xs mt-0.5">{studiesCount} estudo(s) no arquivo</p>
                )}
              </>
            )}
          </div>

          {mode === 'patient' && studiesCount !== undefined && studiesCount > 0 && (
            <div className="flex items-center gap-2 text-wn text-xs bg-wn/10 border border-wn/30 rounded-lg px-3 py-2">
              <AlertCircle size={12} />
              Todos os {studiesCount} estudos deste paciente serão enviados.
            </div>
          )}

          {/* Result state */}
          {result ? (
            <div className={cn(
              'rounded-lg px-4 py-3 flex items-start gap-2 text-sm',
              result.success ? 'bg-ok/10 border border-ok/30 text-ok' : 'bg-er/10 border border-er/30 text-er'
            )}>
              {result.success ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
              <div>
                <p className="font-medium">{result.success ? 'Envio iniciado com sucesso' : 'Falha no envio'}</p>
                <p className="text-xs mt-0.5 opacity-80">{result.message}</p>
                {result.success && (
                  <p className="text-xs mt-1 opacity-60">
                    Enviado para <strong>{selectedDest?.aeTitle}</strong> · Verifique Eventos DICOM se necessário.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-mt uppercase tracking-wide">Selecione o servidor de destino:</p>

              {active.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-mt text-sm">Nenhum servidor cadastrado</p>
                  <button onClick={() => { onClose(); navigate('/destinations') }}
                    className="mt-2 text-xs text-ac hover:underline flex items-center gap-1 mx-auto">
                    <Plus size={11} /> Cadastrar destino DICOM
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {active.map(d => (
                    <label key={d.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedId === d.id
                          ? 'border-ac bg-ac/10'
                          : 'border-bd hover:border-ac/50 hover:bg-s2'
                      )}>
                      <input type="radio" name="dest" value={d.id}
                        checked={selectedId === d.id}
                        onChange={() => setSelectedId(d.id)}
                        className="accent-ac" />
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

              <button onClick={() => { onClose(); navigate('/destinations') }}
                className="text-xs text-ac hover:underline flex items-center gap-1">
                <Plus size={11} /> Cadastrar novo destino
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bd">
          <button onClick={handleClose}
            className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">
            {result?.success ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button onClick={() => void handleSend()}
              disabled={isPending || !selectedId}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : <><Send size={14} /> Enviar</>}
            </button>
          )}
          {result && !result.success && (
            <button onClick={() => setResult(null)}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
