import { useState } from 'react'
import { useConnectionStore, buildBaseUrl } from '../store/connectionStore'
import { useServerStore } from '../store/serverStore'
import { healthCheck } from '../services/dicomweb'
import { checkServerHealth, testSmtp } from '../services/serverApi'
import { CheckCircle, XCircle, Loader2, Activity, Server } from 'lucide-react'
import { cn } from '../lib/utils'

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-mt text-xs uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none" />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-bd bg-s2/50">
        <h2 className="font-semibold text-sm text-tx">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export default function Settings() {
  // dcm4chee connection
  const { host, port, aet, setConnection, setConnected, isConnected } = useConnectionStore()
  const [localHost, setLocalHost] = useState(host)
  const [localPort, setLocalPort] = useState(port || '8080')
  const [localAet,  setLocalAet]  = useState(aet  || 'DCM4CHEE')
  const [dcmStatus, setDcmStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  // pacs-mini server
  const { serverUrl, apiSecret, setServer, isConfigured } = useServerStore()
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl)
  const [localApiSecret, setLocalApiSecret] = useState(apiSecret)
  const [serverStatus,   setServerStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [serverVersion,  setServerVersion]  = useState('')

  // email test
  const [testEmail,     setTestEmail]     = useState('')
  const [emailStatus,   setEmailStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [emailMessage,  setEmailMessage]  = useState('')

  const previewUrl = buildBaseUrl(localHost, localPort)

  async function testDcmConnection() {
    setDcmStatus('loading')
    const ok = await healthCheck(previewUrl, localAet)
    setDcmStatus(ok ? 'ok' : 'error')
    if (ok) {
      setConnection(localHost, localPort, localAet)
      setConnected(true, 'dcm4chee-arc')
    }
  }

  function saveDcmSettings() {
    setConnection(localHost, localPort, localAet)
  }

  async function testServerConnection() {
    setServerStatus('loading')
    const result = await checkServerHealth(localServerUrl)
    setServerStatus(result.ok ? 'ok' : 'error')
    if (result.ok) {
      setServerVersion(result.version ?? '')
      setServer(localServerUrl, localApiSecret)
    }
  }

  function saveServerSettings() {
    setServer(localServerUrl, localApiSecret)
  }

  async function handleEmailTest() {
    setEmailStatus('loading')
    setEmailMessage('')
    try {
      const result = await testSmtp(testEmail || 'test@localhost')
      setEmailStatus('ok')
      setEmailMessage(result.message)
    } catch (e) {
      setEmailStatus('error')
      setEmailMessage((e as Error).message)
    }
  }

  const statusIcon = (status: string) => {
    if (status === 'loading') return <Loader2 size={14} className="animate-spin text-ac" />
    if (status === 'ok')      return <CheckCircle size={14} className="text-ok" />
    if (status === 'error')   return <XCircle size={14} className="text-er" />
    return null
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* dcm4chee Connection */}
      <Section title="Conexão dcm4chee Archive 5">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="IP / Hostname" value={localHost} onChange={setLocalHost} placeholder="192.168.1.100 ou pacs.clinica.com" />
          </div>
          <Field label="Porta" value={localPort} onChange={setLocalPort} placeholder="8080" />
        </div>
        <Field label="AE Title" value={localAet} onChange={setLocalAet} placeholder="DCM4CHEE" />
        {previewUrl && (
          <div className="bg-s2 border border-bd/50 rounded-lg px-3 py-2 text-xs font-mono text-mt">
            URL: <span className="text-ac">{previewUrl}/dcm4chee-arc/aets/{localAet}/rs</span>
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={testDcmConnection}
            className="flex items-center gap-2 px-4 py-2 bg-s2 border border-bd hover:border-ac text-sm text-tx rounded-lg transition-colors">
            {dcmStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            Testar Conexão
          </button>
          <button onClick={saveDcmSettings}
            className="px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
            Salvar
          </button>
          {statusIcon(dcmStatus)}
          {dcmStatus === 'ok'    && <span className="text-ok text-xs">Conectado ao dcm4chee</span>}
          {dcmStatus === 'error' && <span className="text-er text-xs">Falha na conexão</span>}
        </div>
      </Section>

      {/* PACS Mini Server */}
      <Section title="Servidor PACS Mini">
        <Field label="URL do Servidor" value={localServerUrl} onChange={setLocalServerUrl} placeholder="http://localhost:3500" />
        <Field label="API Secret" value={localApiSecret} onChange={setLocalApiSecret} type="password" placeholder="••••••••••••••••" />
        <div className="flex items-center gap-3 pt-1">
          <button onClick={testServerConnection}
            className="flex items-center gap-2 px-4 py-2 bg-s2 border border-bd hover:border-ac text-sm text-tx rounded-lg transition-colors">
            {serverStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
            Testar Conexão
          </button>
          <button onClick={saveServerSettings}
            className="px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
            Salvar
          </button>
          {statusIcon(serverStatus)}
          {serverStatus === 'ok'    && <span className="text-ok text-xs">Conectado{serverVersion ? ` — v${serverVersion}` : ''}</span>}
          {serverStatus === 'error' && <span className="text-er text-xs">Falha na conexão</span>}
        </div>

        {isConfigured && (
          <>
            <hr className="border-bd" />
            <div>
              <p className="text-mt text-xs uppercase tracking-wide mb-3">Teste de Email (SMTP)</p>
              <div className="flex gap-2">
                <input type="email" placeholder="email@clinica.com" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  className="flex-1 bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none" />
                <button onClick={handleEmailTest} disabled={emailStatus === 'loading'}
                  className="px-4 py-2 bg-s2 border border-bd hover:border-ac text-sm text-tx rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {emailStatus === 'loading' && <Loader2 size={13} className="animate-spin" />}
                  Enviar Teste
                </button>
              </div>
              {emailMessage && (
                <p className={cn('text-xs mt-2', emailStatus === 'ok' ? 'text-ok' : 'text-er')}>{emailMessage}</p>
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  )
}
