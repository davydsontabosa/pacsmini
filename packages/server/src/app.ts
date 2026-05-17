import express from 'express'
import cors from 'cors'
import { diskRouter }         from './modules/disk/diskRouter'
import { notifyRouter }       from './modules/notifications/notifyRouter'
import { eventRouter }        from './modules/events/eventRouter'
import { shareRouter }        from './modules/shares/shareRouter'
import { portalRouter }       from './modules/portal/portalRouter'
import { destinationsRouter } from './modules/destinations/destinationsRouter'
import { sendRouter }         from './modules/send/sendRouter'
import { doctorsRouter }      from './modules/doctors/doctorsRouter'
import { proxyRouter }        from './modules/proxy/proxyRouter'
import { errorHandler }       from './middleware/errorHandler'
import { securityHeaders, apiRateLimit } from './middleware/security'
import { requestId }          from './middleware/requestId'
import { httpLogger }         from './middleware/logger'
import { env } from './config/env'

export function createApp() {
  const app = express()

  // ── Proxy trust (Nginx / load balancer) ────────────────────────────────────
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1)

  // ── Middlewares globais ─────────────────────────────────────────────────────
  app.use(requestId)
  app.use(httpLogger)
  app.use(securityHeaders)
  app.use(apiRateLimit)

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)                // curl/Postman
      if (env.NODE_ENV !== 'production') return cb(null, true)
      const allowed = [env.FRONTEND_URL, env.SHARE_BASE_URL].filter(Boolean)
      if (allowed.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origem não permitida — ${origin}`))
    },
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Portal-Password'],
  }))

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: false, limit: '2mb' }))

  // ── Health check (sem auth, sem rate limit) ─────────────────────────────────
  app.get('/health', (_req, res) => res.json({
    ok:           true,
    ts:           new Date().toISOString(),
    version:      '2.0.0',
    env:          env.NODE_ENV,
    diskWarn:     env.DISK_WARN_PERCENT,
    diskCritical: env.DISK_CRITICAL_PERCENT,
  }))

  // ── Rotas da API ────────────────────────────────────────────────────────────
  app.use('/api/disk',          diskRouter)
  app.use('/api/notifications', notifyRouter)
  app.use('/api/events',        eventRouter)
  app.use('/api/shares',        shareRouter)
  app.use('/api/destinations',  destinationsRouter)
  app.use('/api/send',          sendRouter)
  app.use('/api/doctors',       doctorsRouter)
  app.use('/api/proxy',         proxyRouter)
  app.use('/portal',            portalRouter)

  // ── Error handler ───────────────────────────────────────────────────────────
  app.use(errorHandler)

  return app
}
