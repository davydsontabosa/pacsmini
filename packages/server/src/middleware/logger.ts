/**
 * Structured HTTP request logger — substitui morgan com log JSON em produção
 */
import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const ms      = Date.now() - start
    const reqId   = req.headers['x-request-id'] ?? '—'
    const method  = req.method
    const url     = req.originalUrl
    const status  = res.statusCode
    const ip      = req.ip ?? req.socket?.remoteAddress ?? '—'

    if (env.NODE_ENV === 'production') {
      // Log estruturado JSON para ingestão em ferramentas como Loki/CloudWatch
      process.stdout.write(JSON.stringify({
        ts:     new Date().toISOString(),
        level:  status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        reqId,
        method,
        url,
        status,
        ms,
        ip,
      }) + '\n')
    } else {
      const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
      console.log(`${color}${status}\x1b[0m ${method} ${url} ${ms}ms [${reqId}]`)
    }
  })

  next()
}
