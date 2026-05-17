import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Mail, Link2, Lock, X, Download } from 'lucide-react'
import { createShare } from '../../services/serverApi'
import type { DicomStudy } from '../../services/dicomweb'
import { formatDicomName } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface ShareModalProps {
  study:     DicomStudy
  open:      boolean
  onClose:   () => void
  createdBy: string
}

export function ShareModal({ study, open, onClose, createdBy }: ShareModalProps) {
  const qc = useQueryClient()
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendEmail,      setSendEmail]      = useState(false)
  const [expiresHours,   setExpiresHours]   = useState('72')
  const [maxAccesses,    setMaxAccesses]    = useState('')
  const [allowDownload,  setAllowDownload]  = useState(true)
  const [usePassword,    setUsePassword]    = useState(false)
  const [password,       setPassword]       = useState('')
  const [generatedUrl,   setGeneratedUrl]   = useState<string | null>(null)
  const [copied,         setCopied]         = useState(false)
  const [error,          setError]          = useState('')

  const mutation = useMutation({
    mutationFn: () => createShare({
      studyUid:       study.studyInstanceUID,
      studyDesc:      study.studyDescription,
      patientName:    study.patientName,
      patientId:      study.patientId,
      modalities:     study.modalities,
      createdBy,
      recipientEmail: sendEmail && recipientEmail ? recipientEmail : undefined,
      expiresInHours: parseInt(expiresHours, 10),
      maxAccesses:    maxAccesses ? parseInt(maxAccesses, 10) : undefined,
      allowDownload,
      password:       usePassword && password ? password : undefined,
      sendEmail:      sendEmail && !!recipientEmail,
    }),
    onSuccess: (token) => {
      setGeneratedUrl(token.shareUrl)
      setError('')
      qc.invalidateQueries({ queryKey: ['shares'] })
    },
    onError: (e) => setError((e as Error).message),
  })

  async function handleCopy() {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setGeneratedUrl(null)
    setCopied(false)
    setRecipientEmail('')
    setPassword('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-s1 border border-bd rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2 text-tx font-semibold">
            <Link2 size={16} className="text-ac" />
            Compartilhar Exame
          </div>
          <button onClick={handleClose} className="text-mt hover:text-tx transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Study info */}
          <div className="bg-s2 border border-bd rounded-lg p-3 text-sm">
            <p className="font-semibold text-tx">{formatDicomName(study.patientName)}</p>
            <p className="text-mt text-xs mt-0.5">
              {study.studyDescription || 'Sem descrição'} · {study.modalities.join(', ')}
            </p>
          </div>

          {!generatedUrl ? (
            <>
              {/* Expires */}
              <div>
                <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Validade</label>
                <select
                  value={expiresHours} onChange={e => setExpiresHours(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                >
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas (padrão)</option>
                  <option value="168">7 dias</option>
                  <option value="720">30 dias</option>
                </select>
              </div>

              {/* Max accesses */}
              <div>
                <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Máx. acessos (vazio = ilimitado)</label>
                <input
                  type="number" placeholder="Ilimitado" value={maxAccesses}
                  onChange={e => setMaxAccesses(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <Toggle label="Permitir download" icon={Download} checked={allowDownload} onChange={setAllowDownload} />
                <Toggle label="Proteger com senha" icon={Lock} checked={usePassword} onChange={setUsePassword} />
              </div>

              {usePassword && (
                <input
                  type="text" placeholder="Senha de acesso" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none font-mono"
                />
              )}

              <div className="space-y-2">
                <Toggle label="Enviar por email" icon={Mail} checked={sendEmail} onChange={setSendEmail} />
                {sendEmail && (
                  <input
                    type="email" placeholder="email@medico.com" value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                  />
                )}
              </div>

              {error && <p className="text-er text-xs">{error}</p>}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-ok text-sm font-medium">
                <Check size={14} /> Link gerado com sucesso
              </div>
              <div className="flex gap-2">
                <input readOnly value={generatedUrl}
                  className="flex-1 bg-s2 border border-bd rounded-lg px-3 py-2 text-xs font-mono text-ac outline-none" />
                <button onClick={handleCopy}
                  className="px-3 py-2 bg-s2 border border-bd rounded-lg text-mt hover:text-tx transition-colors">
                  {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                </button>
              </div>
              {sendEmail && recipientEmail && (
                <p className="text-xs text-mt">✉ Email enviado para <strong>{recipientEmail}</strong></p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bd">
          <button onClick={handleClose}
            className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">
            Fechar
          </button>
          {!generatedUrl && (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (usePassword && !password)}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Gerando…' : 'Gerar Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, icon: Icon, checked, onChange }: {
  label: string
  icon: React.ElementType
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-1.5 text-sm text-tx cursor-pointer">
        <Icon size={13} className="text-mt" /> {label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors relative',
          checked ? 'bg-ac' : 'bg-bd'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-4 h-4 bg-bg rounded-full transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}
