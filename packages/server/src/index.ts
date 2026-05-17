import 'dotenv/config'
import { createApp }    from './app'
import { initDatabase } from './db/database'
import { startDiskCron }  from './modules/disk/diskCron'
import { startEventCron } from './modules/events/eventCron'
import { env } from './config/env'

async function main() {
  // ── Validação de segredos em produção ───────────────────────────────────────
  if (env.NODE_ENV === 'production') {
    const weakSecrets = ['changeme-dev-secret', 'secret', 'password', '12345678']
    if (weakSecrets.includes(env.API_SECRET)) {
      console.error('[PACS Mini] ERRO: API_SECRET é inseguro para produção. Defina um valor forte no .env')
      process.exit(1)
    }
  }

  initDatabase()
  startDiskCron()
  startEventCron()

  const app    = createApp()
  const port   = parseInt(env.PORT, 10)
  const server = app.listen(port, () => {
    console.log(`[PACS Mini] Servidor: http://0.0.0.0:${port}  [${env.NODE_ENV}]`)
    console.log(`[PACS Mini] Frontend: ${env.FRONTEND_URL}`)
    console.log(`[PACS Mini] Portal:   ${env.SHARE_BASE_URL}/#/portal/:token`)
  })

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  const signals = ['SIGTERM', 'SIGINT'] as const
  signals.forEach(sig => {
    process.on(sig, () => {
      console.log(`\n[PACS Mini] Recebido ${sig} — encerrando graciosamente...`)
      server.close((err) => {
        if (err) {
          console.error('[PACS Mini] Erro ao fechar servidor:', err.message)
          process.exit(1)
        }
        console.log('[PACS Mini] Servidor encerrado com sucesso.')
        process.exit(0)
      })
      // Timeout de segurança: força encerramento após 10s
      setTimeout(() => {
        console.error('[PACS Mini] Timeout de shutdown — forçando encerramento.')
        process.exit(1)
      }, 10_000)
    })
  })
}

main().catch(err => {
  console.error('[PACS Mini] Erro fatal:', err)
  process.exit(1)
})
