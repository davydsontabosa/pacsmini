import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Mail, Link2, Lock, X, Download, UserCheck, QrCode, ChevronDown } from 'lucide-react'
import { createShare, type ShareCreatedResult } from '../../services/serverApi'
import { getDoctors } from '../../services/doctors'
import { useQuery } from '@tanstack/react-query'
import { useServerStore } from '../../store/serverStore'
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
  const qc               = useQueryClient()
  const { isConfigured } = useServerStore()

  // Form state
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [recipientEmail,   setRecipientEmail]   = useState('')
  const [expiresHours,     setExpiresHours]     = useState('72')
  const [maxAccesses,      setMaxAccesses]      = useState('')
  const [allowDownload,    setAllowDownload]    = useState(true)
  const [usePassword,      setUsePassword]      = useState(false)
  const [password,         setPassword]         = useState('')
  const [sendEmail,        setSendEmail]        = useState(true)
  const [showQr,           setShowQr]           = useState(false)
  const [copied,           setCopied]           = useState(false)
  const [error,            setError]            = useState('')

  // Result state
  const [result, setResult] = useState<ShareCreatedResult | null>(null)

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn:  getDoctors,
    enabled:  isConfigured && open,
  })

  const activeDoctors = doctors?.filter(d => d.isActive) ?? []

  function selectDoctor(id: number | null) {
    setSelectedDoctorId(id)
    if (id == null) { setRecipientEmail(''); return }
    const doc = activeDoctors.find(d => d.id === id)
    if (doc?.email) setRecipientEmail(doc.email)
  }

  const mutation = useMutation({
    mutationFn: () => createShare({
      studyUid:       study.studyInstanceUID,
      studyDesc:      study.studyDescription,
      patientName:    study.patientName,
      patientId:      study.patientId,
      modalities:     study.modalities,
      createdBy,
      doctorId:       selectedDoctorId ?? undefined,
      recipientEmail: recipientEmail || undefined,
      expiresInHours: parseInt(expiresHours, 10),
      maxAccesses:    maxAccesses ? parseInt(maxAccesses, 10) : undefined,
      allowDownload,
      password:       usePassword && password ? password : undefined,
      sendEmail:      sendEmail && (!!selectedDoctorId || !!recipientEmail),
    }),
    onSuccess: (data) => {
      setResult(data)
      setError('')
      qc.invalidateQueries({ queryKey: ['shares'] })
    },
    onError: (e) => setError((e as Error).message),
  })

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setResult(null)
    setCopied(false)
    setError('')
    setSelectedDoctorId(null)
    setRecipientEmail('')
    setPassword('')
    setShowQr(false)
    setSendEmail(true)
    onClose()
  }

  if (!open) return null

  const selectedDoctor = activeDoctors.find(d => d.id === selectedDoctorId)
  const willSendEmail  = sendEmail && (!!selectedDoctorId || !!recipientEmail)
  const effectiveEmail = result?.recipient_email ?? recipientEmail

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-s1 border border-bd rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd shrink-0">
          <div className="flex items-center gap-2 text-tx font-semibold">
            <Link2 size={16} className="text-ac" />
            Compartilhar Exame
          </div>
          <button onClick={handleClose} className="text-mt hover:text-tx transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">

          {/* Study info */}
          <div className="bg-s2 border border-bd rounded-lg p-3 text-sm">
            <p className="font-semibold text-tx">{formatDicomName(study.patientName)}</p>
            <p className="text-mt text-xs mt-0.5">
              {study.studyDescription || 'Sem descrição'} · {study.modalities.join(', ')}
            </p>
          </div>

          {/* ── Formulário ── */}
          {!result ? (
            <>
              {/* Médico */}
              <div>
                <label className="block text-mt text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <UserCheck size={11} /> Vincular ao médico
                </label>
                <div className="relative">
                  <select
                    value={selectedDoctorId ?? ''}
                    onChange={e => selectDoctor(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none appearance-none pr-8"
                  >
                    <option value="">— Selecionar médico (opcional) —</option>
                    {activeDoctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.crm ? ` · CRM ${d.crm}` : ''}{d.specialization ? ` · ${d.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mt pointer-events-none" />
                </div>
                {selectedDoctor && (
                  <p className="text-xs text-ok mt-1 flex items-center gap-1">
                    <Check size={11} />
                    {selectedDoctor.email
                      ? <>Email: <span className="font-mono">{selectedDoctor.email}</span></>
                      : <span className="text-wr">Médico sem e-mail cadastrado</span>
                    }
                  </p>
                )}
              </div>

              {/* Validade */}
              <div>
                <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">Validade</label>
                <select
                  value={expiresHours} onChange={e => setExpiresHours(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                >
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas — 3 dias (padrão)</option>
                  <option value="168">7 dias</option>
                  <option value="720">30 dias</option>
                </select>
              </div>

              {/* Max accesses */}
              <div>
                <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">
                  Máx. acessos <span className="normal-case">(vazio = ilimitado)</span>
                </label>
                <input
                  type="number" min={1} placeholder="Ilimitado" value={maxAccesses}
                  onChange={e => setMaxAccesses(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <Toggle label="Permitir download do ZIP" icon={Download} checked={allowDownload} onChange={setAllowDownload} />
                <Toggle label="Proteger com senha"       icon={Lock}     checked={usePassword}   onChange={setUsePassword}   />
              </div>

              {usePassword && (
                <input
                  type="text" placeholder="Senha de acesso (mín. 4 caracteres)" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none font-mono"
                />
              )}

              {/* E-mail */}
              <div className="space-y-2">
                <Toggle label="Enviar link por e-mail" icon={Mail} checked={sendEmail} onChange={setSendEmail} />
                {sendEmail && (
                  <input
                    type="email"
                    placeholder={selectedDoctor?.email || 'email@medico.com'}
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none"
                  />
                )}
              </div>

              {error && <p className="text-er text-xs bg-er/10 rounded-lg px-3 py-2">{error}</p>}
            </>
          ) : (
            /* ── Resultado ── */
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-ok text-sm font-semibold">
                <Check size={15} /> Link gerado com sucesso!
              </div>

              {/* Doctor badge */}
              {result.doctorName && (
                <div className="flex items-center gap-2 text-xs text-ac bg-ac/10 border border-ac/20 rounded-lg px-3 py-2">
                  <UserCheck size={13} />
                  Vinculado ao Dr(a). <strong>{result.doctorName}</strong>
                </div>
              )}

              {/* URL + copy */}
              <div className="flex gap-2">
                <input
                  readOnly value={result.shareUrl}
                  className="flex-1 bg-s2 border border-bd rounded-lg px-3 py-2 text-xs font-mono text-ac outline-none min-w-0"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-s2 border border-bd rounded-lg text-mt hover:text-tx transition-colors shrink-0"
                  title="Copiar link"
                >
                  {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Email status */}
              {willSendEmail && effectiveEmail && (
                <p className="text-xs text-ok flex items-center gap-1.5">
                  <Mail size={12} /> E-mail enviado para <strong>{effectiveEmail}</strong>
                </p>
              )}

              {/* QR code toggle */}
              <div>
                <button
                  onClick={() => setShowQr(v => !v)}
                  className="flex items-center gap-2 text-xs text-mt hover:text-tx transition-colors"
                >
                  <QrCode size={13} className="text-ac" />
                  {showQr ? 'Ocultar QR Code' : 'Mostrar QR Code para escaneamento'}
                </button>

                {showQr && result.qrDataUrl && (
                  <div className="mt-3 flex flex-col items-center gap-2 bg-s2 border border-bd rounded-xl p-4">
                    <img
                      src={result.qrDataUrl}
                      alt="QR Code de acesso ao exame"
                      className="w-48 h-48 rounded-lg"
                    />
                    <p className="text-xs text-mt text-center">
                      Escaneie com o celular para abrir o exame no navegador
                    </p>
                    <a
                      href={result.qrDataUrl}
                      download={`qr-exame-${study.patientId || 'paciente'}.png`}
                      className="text-xs text-ac hover:underline flex items-center gap-1"
                    >
                      <Download size={11} /> Baixar QR Code
                    </a>
                  </div>
                )}
              </div>

              {/* Expiry info */}
              <p className="text-xs text-mt border-t border-bd pt-3">
                Válido por {expiresHours}h · expira em{' '}
                <span className="text-wr font-medium">
                  {new Date(result.expires_at).toLocaleString('pt-BR')}
                </span>
                {result.max_accesses ? ` · máx. ${result.max_accesses} acesso(s)` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-bd shrink-0">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">
            Fechar
          </button>
          {!result && (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (usePassword && (!password || password.length < 4))}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending
                ? <><span className="w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />Gerando…</>
                : <><Link2 size={14} />Gerar Link</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, icon: Icon, checked, onChange }: {
  label:    string
  icon:     React.ElementType
  checked:  boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-1.5 text-sm text-tx cursor-pointer select-none">
        <Icon size={13} className="text-mt" /> {label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('w-10 h-5 rounded-full transition-colors relative shrink-0', checked ? 'bg-ac' : 'bg-bd')}
      >
        <span className={cn(
          'absolute top-0.5 w-4 h-4 bg-bg rounded-full transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}
