import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Lock, Activity, X, AlertTriangle } from 'lucide-react'
import {
  getPortalInfo, getPortalSeries,
  getPortalThumbnailUrl, getPortalDownloadUrl,
  PortalInfo
} from '../services/serverApi'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '../lib/utils'

// Use relative URL so that nginx/vite-proxy routes /portal/* to the backend.
// This avoids baking the backend host into the build and works for external doctors.
const SERVER_URL = ''

interface SeriesData {
  '0020000E'?: { Value?: string[] }
  '00200011'?: { Value?: unknown[] }
  '00080060'?: { Value?: unknown[] }
  '0008103E'?: { Value?: unknown[] }
  '00201209'?: { Value?: unknown[] }
  '00180015'?: { Value?: unknown[] }
}

interface InstanceData {
  '00080018'?: { Value?: string[] }
}

function getStr(obj: Record<string, { Value?: unknown[] }>, tag: string): string {
  const v = obj[tag]?.Value?.[0]
  if (typeof v === 'object' && v !== null && 'Alphabetic' in v) return String((v as { Alphabetic: string }).Alphabetic)
  return String(v ?? '')
}

export default function Portal() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const [portalInfo, setPortalInfo]   = useState<PortalInfo | null>(null)
  const [password,   setPassword]     = useState('')
  const [inputPw,    setInputPw]      = useState('')
  const [error,      setError]        = useState<{ status?: number; message: string } | null>(null)
  const [loading,    setLoading]      = useState(true)
  const [needsPass,  setNeedsPass]    = useState(false)
  const [series,     setSeries]       = useState<SeriesData[]>([])
  const [instanceMap, setInstanceMap] = useState<Record<string, InstanceData[]>>({})
  const [lightbox,   setLightbox]     = useState<string | null>(null)

  async function loadInfo(pw?: string) {
    if (!tokenId) return
    setLoading(true)
    setError(null)
    try {
      const info = await getPortalInfo(SERVER_URL, tokenId, pw)
      setPortalInfo(info)
      setPassword(pw ?? '')
      setNeedsPass(false)
      // Load series
      const seriesData = await getPortalSeries(SERVER_URL, tokenId, pw) as SeriesData[]
      setSeries(seriesData ?? [])
      // Load instances for each series (first 5 thumbnails)
      const map: Record<string, InstanceData[]> = {}
      for (const s of seriesData) {
        const uid = s['0020000E']?.Value?.[0] ?? ''
        if (!uid) continue
        try {
          const res = await fetch(`${SERVER_URL}/portal/${tokenId}/instances/${uid}`, {
            headers: pw ? { 'X-Portal-Password': pw } : {},
          })
          map[uid] = await res.json()
        } catch { map[uid] = [] }
      }
      setInstanceMap(map)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { requiresPassword?: boolean; error?: string } } }
      if (err.response?.status === 401 && err.response?.data?.requiresPassword) {
        setNeedsPass(true)
      } else {
        setError({
          status: err.response?.status,
          message: err.response?.data?.error ?? (e as Error).message,
        })
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadInfo() }, [tokenId])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex items-center gap-3 text-mt">
        <Activity size={20} className="text-ac animate-pulse" />
        <span>Carregando exame...</span>
      </div>
    </div>
  )

  if (needsPass) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-s1 border border-bd rounded-xl p-8 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={20} className="text-ac" />
          <span className="font-bold text-tx">PACS Mini</span>
        </div>
        <div className="flex items-center gap-2 text-mt mb-4">
          <Lock size={16} /> <span className="text-sm">Este link é protegido por senha</span>
        </div>
        <input type="password" placeholder="Senha de acesso" value={inputPw} onChange={e => setInputPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadInfo(inputPw)}
          className="w-full bg-s2 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none mb-3" />
        <button onClick={() => loadInfo(inputPw)}
          className="w-full py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
          Acessar
        </button>
        {error && <p className="text-er text-xs mt-3">{error.message}</p>}
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-s1 border border-er/30 rounded-xl p-8 max-w-sm w-full text-center">
        <AlertTriangle size={40} className="text-er mx-auto mb-4" />
        <p className="text-tx font-semibold mb-2">Link indisponível</p>
        <p className="text-mt text-sm">{error.message}</p>
      </div>
    </div>
  )

  if (!portalInfo) return null

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-s1 border-b border-bd px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-ac" />
          <span className="font-bold text-tx">PACS Mini</span>
        </div>
        <div className="text-xs text-mt font-mono">
          Expira em: {format(parseISO(portalInfo.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Study info */}
        <div className="bg-s1 border border-bd rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-tx font-bold text-lg">{portalInfo.patientName ?? 'Paciente'}</p>
              <p className="text-mt text-sm mt-1">{portalInfo.studyDesc || 'Exame DICOM'}</p>
              <div className="flex gap-2 mt-2">
                {portalInfo.modalities.map(m => (
                  <span key={m} className="px-2 py-0.5 bg-ac/10 text-ac rounded text-xs font-mono">{m}</span>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-mt">
              <p>Acesso {portalInfo.accessCount}{portalInfo.maxAccesses ? ` de ${portalInfo.maxAccesses}` : ''}</p>
            </div>
          </div>

          {portalInfo.allowDownload && (
            <div className="mt-4 pt-4 border-t border-bd">
              <a href={getPortalDownloadUrl(SERVER_URL, portalInfo.id, 'study')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors">
                <Download size={14} /> Baixar Estudo Completo (.ZIP)
              </a>
            </div>
          )}
        </div>

        {/* Series */}
        <div className="space-y-4">
          {series.map((s, idx) => {
            const seriesUid = s['0020000E']?.Value?.[0] ?? ''
            const instances = instanceMap[seriesUid] ?? []
            const thumbs = instances.slice(0, 5)
            const extra   = instances.length - 5

            return (
              <div key={idx} className="bg-s1 border border-bd rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-mt font-mono">Série {getStr(s as Record<string, { Value?: unknown[] }>, '00200011')} · </span>
                    <span className="text-xs text-ac font-mono">{getStr(s as Record<string, { Value?: unknown[] }>, '00080060')}</span>
                    {getStr(s as Record<string, { Value?: unknown[] }>, '0008103E') && (
                      <span className="text-xs text-mt"> · {getStr(s as Record<string, { Value?: unknown[] }>, '0008103E')}</span>
                    )}
                    <span className="text-xs text-mt"> · {instances.length} instâncias</span>
                  </div>
                  {portalInfo.allowDownload && seriesUid && (
                    <a href={getPortalDownloadUrl(SERVER_URL, portalInfo.id, 'series', seriesUid)}
                      className="flex items-center gap-1 text-xs text-ac hover:underline">
                      <Download size={12} /> Baixar série
                    </a>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {thumbs.map((inst, ti) => {
                    const instUid = inst['00080018']?.Value?.[0] ?? ''
                    const thumbUrl = getPortalThumbnailUrl(SERVER_URL, portalInfo.id, seriesUid, instUid)
                    return (
                      <img key={ti} src={thumbUrl} alt={`thumb ${ti}`} loading="lazy"
                        onClick={() => setLightbox(getPortalThumbnailUrl(SERVER_URL, portalInfo.id, seriesUid, instUid, 1024))}
                        className="w-16 h-16 object-cover rounded border border-bd bg-s2 cursor-pointer hover:border-ac transition-colors" />
                    )
                  })}
                  {extra > 0 && (
                    <div className="w-16 h-16 rounded border border-bd bg-s2 flex items-center justify-center text-mt text-xs">
                      +{extra}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {series.length === 0 && (
            <div className="bg-s1 border border-bd rounded-xl p-8 text-center text-mt text-sm">
              Nenhuma série encontrada.
            </div>
          )}
        </div>

        <p className="text-center text-mt text-xs pb-8">
          PACS Mini · Acesso seguro de exames
        </p>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          <img src={lightbox} alt="DICOM image" className="max-h-full max-w-full object-contain rounded" />
        </div>
      )}
    </div>
  )
}
