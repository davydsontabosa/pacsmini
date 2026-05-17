import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env'

export function errorHandler(
  err: Error, req: Request, res: Response, _next: NextFunction
) {
  const reqId = req.headers['x-request-id'] ?? '—'

  if (err instanceof ZodError) {
    return res.status(400).json({
      error:   'Dados inválidos',
      details: err.flatten(),
      reqId,
    })
  }

  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message, reqId })
  }

  // Log completo internamente
  console.error(JSON.stringify({
    ts:    new Date().toISOString(),
    level: 'error',
    reqId,
    msg:   err.message,
    stack: err.stack,
  }))

  // Em produção: não expõe detalhes internos ao cliente
  const message = env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : (err.message ?? 'Erro interno do servidor')

  res.status(500).json({ error: message, reqId })
}
