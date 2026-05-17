import { z } from 'zod'

const EnvSchema = z.object({
  PORT:             z.string().default('3500'),
  API_SECRET:       z.string().min(8).default('changeme-dev-secret'),
  NODE_ENV:         z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL:     z.string().default('http://localhost:5173'),

  DCM4CHEE_BASE_URL: z.string().default('http://localhost:8080'),
  DCM4CHEE_AET:      z.string().default('DCM4CHEE'),

  SMTP_HOST:        z.string().default('smtp.gmail.com'),
  SMTP_PORT:        z.string().default('587'),
  SMTP_SECURE:      z.string().default('false'),
  SMTP_USER:        z.string().default(''),
  SMTP_PASS:        z.string().default(''),
  EMAIL_FROM:       z.string().default('pacs@localhost'),
  EMAIL_ALERT_TO:   z.string().default('admin@localhost'),

  STORAGE_PATH:           z.string().default('/storage'),
  DISK_WARN_PERCENT:      z.string().default('80'),
  DISK_CRITICAL_PERCENT:  z.string().default('90'),
  DISK_CHECK_CRON:        z.string().default('0 */1 * * *'),
  DISK_COOLDOWN_HOURS:    z.string().default('4'),

  SHARE_BASE_URL:          z.string().default('http://localhost:5173'),
  SHARE_DEFAULT_EXPIRES_H: z.string().default('72'),
  SHARE_MAX_ACCESSES:      z.string().default('0'),

  DB_PATH: z.string().default('./data/pacs-mini.db'),
})

function loadEnv() {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('[PACS Mini] Variáveis de ambiente inválidas:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}

export const env = loadEnv()
export type Env = z.infer<typeof EnvSchema>
