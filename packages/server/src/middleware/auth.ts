import { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'
import { env } from '../config/env'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização ausente' })
  }
  const token = authHeader.slice(7)
  const tokenBuf  = Buffer.from(token)
  const secretBuf = Buffer.from(env.API_SECRET)
  const isValid   = tokenBuf.length === secretBuf.length &&
                    timingSafeEqual(tokenBuf, secretBuf)
  if (!isValid) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  next()
}
