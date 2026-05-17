import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Trash2, Link2, AlertCircle } from 'lucide-react'
import { getShares, revokeShare, ShareToken } from '../services/serverApi'
import { useServerStore } from '../store/serverStore'
import { formatDicomDate, cn } from '../lib/utils'
import { format, parseISO, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function StatusBadge({ token }: { token: ShareToken }) {
  if (token.revoked) return <span className="px-2 py-0.5 text-xs rounded bg-er/10 text-er">Revogado</span>
  const expiresAt = parseISO(token.expires_at)
  const now = new Date()
  if (expiresAt < now) return <span className="px-2 py-0.5 text-xs rounded bg-mt/20 text-mt">Expirado</span>
  const hoursLeft = differenceInHours(expiresAt, now)
  if (hoursLeft < 6) return <span className="px-2 py-0.5 text-xs rounded bg-wn/10 text-wn">Expira em {hoursLeft}h</span>
  return <span className="px-2 py-0.5 text-xs rounded bg-ok/10 text-ok">Ativo</span>
}

export default function Shares() {
  const { isConfigured } = useServerStore()
  const qc = useQueryClient()
  const [filter, setFilter]     = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  const { data: shares, isLoading, error } = useQuery({
    queryKey: ['shares'],
    queryFn:  getShares,
    refetchInterval: 30_000,
    enabled: isConfigured,
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shares'] }); setConfirmRevoke(null) },
  })

  async function handleCopy(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = (shares ?? []).filter(s =>
    !filter ||
    s.patient_name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.study_desc?.toLowerCase().includes(filter.toLowerCase())
  )

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-wn text-sm bg-wn/10 border border-wn/30 rounded-lg px-4 py-3">
        <AlertCircle size={14} /> Configure o Servidor PACS Mini nas Configurações para gerenciar compartilhamentos.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-ac" />
          <h1 className="font-semibold text-tx">Links de Compartilhamento</h1>
          {shares && <span className="text-xs bg-ac/10 text-ac px-2 py-0.5 rounded font-mono">{filtered.length} ativos</span>}
        </div>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por paciente ou exame..."
          className="bg-s1 border border-bd rounded-lg px-3 py-2 text-sm text-tx focus:border-ac outline-none w-72" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-er text-sm bg-er/10 border border-er/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} /> Erro ao carregar links: {(error as Error).message}
        </div>
      )}

      <div className="bg-s1 border border-bd rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd">
                <th className="text-left px-5 py-3 text-mt text-xs font-medium">Paciente</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Exame</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Mod.</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Criado</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Expira</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Acessos</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Status</th>
                <th className="text-left px-4 py-3 text-mt text-xs font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-5 py-8 text-center text-mt">Carregando...</td></tr>}
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-bd/50 hover:bg-s2/50 transition-colors">
                  <td className="px-5 py-3 text-tx">{s.patient_name || '—'}</td>
                  <td className="px-4 py-3 text-mt text-xs truncate max-w-[150px]">{s.study_desc || '—'}</td>
                  <td className="px-4 py-3">
                    {(s.modalities ?? []).map((m: string) => (
                      <span key={m} className="mr-1 px-1.5 py-0.5 bg-ac/10 text-ac rounded text-xs">{m}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-mt font-mono text-xs">
                    {format(parseISO(s.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-mt font-mono text-xs">
                    {format(parseISO(s.expires_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-mt font-mono text-xs">
                    {s.access_count}{s.max_accesses ? ` / ${s.max_accesses}` : ''}
                  </td>
                  <td className="px-4 py-3"><StatusBadge token={s} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopy(s.shareUrl, s.id)}
                        className="p-1.5 text-mt hover:text-ac transition-colors rounded"
                        title="Copiar link">
                        {copiedId === s.id ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
                      </button>
                      {!s.revoked && (
                        <button onClick={() => setConfirmRevoke(s.id)}
                          className="p-1.5 text-mt hover:text-er transition-colors rounded"
                          title="Revogar link">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !filtered.length && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-mt">Nenhum link de compartilhamento ativo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Revoke Dialog */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-s1 border border-bd rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <p className="text-tx font-semibold mb-2">Revogar link?</p>
            <p className="text-mt text-sm mb-5">O link será revogado imediatamente e o médico perderá o acesso.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRevoke(null)}
                className="px-4 py-2 text-sm text-mt hover:text-tx transition-colors">Cancelar</button>
              <button onClick={() => revokeMutation.mutate(confirmRevoke)}
                disabled={revokeMutation.isPending}
                className="px-4 py-2 bg-er hover:bg-er/80 text-bg font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
                {revokeMutation.isPending ? 'Revogando...' : 'Revogar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
