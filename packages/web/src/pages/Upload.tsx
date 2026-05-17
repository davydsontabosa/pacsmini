import { useState, useRef, useCallback } from 'react'
import { Upload as UploadIcon, X, CheckCircle, AlertCircle, Loader2, Play, FileX } from 'lucide-react'
import { useConnectionStore, buildBaseUrl } from '../store/connectionStore'
import { uploadDicom } from '../services/dicomweb'
import { cn } from '../lib/utils'

type FileStatus = 'waiting' | 'uploading' | 'done' | 'error'

interface FileItem {
  id:       number
  file:     File
  status:   FileStatus
  progress: number   // 0–100
  error?:   string
}

// Mock .dcm files for demo when no real files are selected
const MOCK_FILES = [
  { name: 'CT_CHEST_001.dcm',  size: 524288  },
  { name: 'CT_CHEST_002.dcm',  size: 487424  },
  { name: 'MR_BRAIN_001.dcm',  size: 1048576 },
  { name: 'MR_BRAIN_002.dcm',  size: 983040  },
  { name: 'CR_THORAX_001.dcm', size: 262144  },
]

let _id = 0
function nextId() { return ++_id }

function makeMockFile(name: string, size: number): File {
  const buf = new ArrayBuffer(size)
  return new File([buf], name, { type: 'application/dicom' })
}

export default function Upload() {
  const [files,     setFiles]     = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [summary,   setSummary]   = useState<{ ok: number; fail: number } | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const dropRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { host, port, aet } = useConnectionStore()
  const dicomwebBase = `${buildBaseUrl(host, port)}/dcm4chee-arc/aets/${aet}/rs`

  function addFiles(newFiles: FileList | File[]) {
    const items: FileItem[] = Array.from(newFiles)
      .filter(f => f.name.toLowerCase().endsWith('.dcm'))
      .map(file => ({ id: nextId(), file, status: 'waiting', progress: 0 }))
    if (!items.length) return
    setFiles(prev => [...prev, ...items])
    setSummary(null)
  }

  function addMockFiles() {
    const items: FileItem[] = MOCK_FILES.map(m => ({
      id:       nextId(),
      file:     makeMockFile(m.name, m.size),
      status:   'waiting' as FileStatus,
      progress: 0,
    }))
    setFiles(prev => [...prev, ...items])
    setSummary(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [])

  function removeFile(id: number) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  async function handleUpload() {
    const pending = files.filter(f => f.status !== 'done')
    if (!pending.length || uploading) return
    setUploading(true)
    setSummary(null)
    let ok = 0, fail = 0

    for (const item of pending) {
      // Mark as uploading
      setFiles(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f
      ))

      // Animate progress (simulate or real — both look the same visually)
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f =>
          f.id === item.id && f.status === 'uploading' && f.progress < 85
            ? { ...f, progress: f.progress + Math.random() * 18 }
            : f
        ))
      }, 150)

      const result = await uploadDicom(item.file, dicomwebBase)
      clearInterval(progressInterval)

      if (result.success) {
        ok++
        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'done', progress: 100 } : f
        ))
      } else {
        fail++
        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'error', progress: 0, error: result.error } : f
        ))
      }
    }

    setSummary({ ok, fail })
    setUploading(false)
  }

  const totalDone    = files.filter(f => f.status === 'done').length
  const totalPending = files.filter(f => f.status !== 'done').length
  const overallPct   = files.length ? Math.round((totalDone / files.length) * 100) : 0

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-tx">Enviar DICOM</h1>
        <p className="text-mt text-sm mt-0.5">Envie arquivos .dcm para o servidor dcm4chee via STOW-RS</p>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-ac bg-ac/10 scale-[1.01]'
            : 'border-bd hover:border-ac hover:bg-ac/5'
        )}
      >
        <UploadIcon size={40} className={cn('mx-auto mb-3 transition-colors', dragOver ? 'text-ac' : 'text-mt')} />
        <p className="text-tx font-medium mb-1">Arraste arquivos .dcm aqui</p>
        <p className="text-mt text-sm">ou clique para selecionar</p>
        <input
          ref={inputRef} type="file" accept=".dcm" multiple className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Demo button */}
      {files.length === 0 && (
        <div className="text-center">
          <button
            onClick={addMockFiles}
            className="text-xs text-ac hover:underline"
          >
            Simular arquivos de demo (sem servidor necessário)
          </button>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-bd">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-tx">{files.length} arquivo(s)</p>
              {uploading && (
                <span className="text-xs text-ac font-mono">{overallPct}%</span>
              )}
            </div>
            <button
              onClick={() => { setFiles([]); setSummary(null) }}
              disabled={uploading}
              className="text-xs text-mt hover:text-er transition-colors disabled:opacity-40"
            >
              Limpar lista
            </button>
          </div>

          {/* Overall progress bar */}
          {uploading && (
            <div className="h-1 bg-s2">
              <div
                className="h-full bg-ac transition-all duration-300"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          )}

          {/* Files */}
          <div className="divide-y divide-bd/40 max-h-72 overflow-y-auto">
            {files.map(f => (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="shrink-0">
                    {f.status === 'uploading' && <Loader2 size={14} className="animate-spin text-ac" />}
                    {f.status === 'done'      && <CheckCircle size={14} className="text-ok" />}
                    {f.status === 'error'     && <AlertCircle size={14} className="text-er" />}
                    {f.status === 'waiting'   && <div className="w-3.5 h-3.5 rounded-full border border-bd" />}
                  </div>

                  {/* Name + error */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      f.status === 'done'  ? 'text-ok'  :
                      f.status === 'error' ? 'text-er'  : 'text-tx'
                    )}>
                      {f.file.name}
                    </p>
                    {f.error && <p className="text-xs text-er mt-0.5">{f.error}</p>}
                  </div>

                  {/* Size */}
                  <span className="text-xs text-mt font-mono shrink-0">
                    {(f.file.size / 1024).toFixed(0)} KB
                  </span>

                  {/* Remove */}
                  {!uploading && (
                    <button onClick={() => removeFile(f.id)} className="text-mt hover:text-er shrink-0 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                  {uploading && f.status === 'waiting' && (
                    <FileX size={14} className="text-mt/40 shrink-0" />
                  )}
                </div>

                {/* Per-file progress bar */}
                {f.status === 'uploading' && (
                  <div className="mt-2 h-1 bg-s2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ac rounded-full transition-all duration-200"
                      style={{ width: `${Math.min(f.progress, 100)}%` }}
                    />
                  </div>
                )}
                {f.status === 'done' && (
                  <div className="mt-2 h-1 bg-ok/20 rounded-full overflow-hidden">
                    <div className="h-full bg-ok rounded-full w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-bd">
            <p className="text-xs text-mt">
              {totalDone} concluído(s) · {totalPending} pendente(s)
            </p>
            <button
              onClick={() => void handleUpload()}
              disabled={uploading || totalPending === 0}
              className="px-5 py-2 bg-ac hover:bg-ac2 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando…</>
                : <><Play size={14} /> Enviar</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className={cn(
          'rounded-xl px-5 py-4 border flex items-center gap-3',
          summary.fail === 0
            ? 'bg-ok/10 border-ok/30 text-ok'
            : 'bg-wn/10 border-wn/30 text-wn'
        )}>
          {summary.fail === 0
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />
          }
          <p className="font-medium text-sm">
            {summary.ok} arquivo(s) enviado(s) com sucesso
            {summary.fail > 0 && ` · ${summary.fail} com erro`}
          </p>
        </div>
      )}
    </div>
  )
}
