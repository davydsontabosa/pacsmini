/**
 * Security middleware: helmet headers + rate limiting
 */
import helmet from 'helmet'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { env } from '../config/env'

/** HTTP security headers via helmet */
export const securityHeaders = helmet({
  contentSecurityPolicy: false,          // desabilitado para API REST
  crossOriginEmbedderPolicy: false,
})

/** Rate limit geral para todas as rotas da API */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,            // 15 minutos
  max:      env.NODE_ENV === 'production' ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  skip: (req) => req.path === '/health', // não limita healthcheck
})

/** Rate limit restrito para rotas sensíveis (echo, send) */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,                  // 1 minuto
  max:      env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Operação limitada. Tente novamente em 1 minuto.' },
})

/** Rate limit para portal público — sem autenticação, protege brute-force de tokens/senhas */
export const portalRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,             // 5 minutos
  max:      env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas tentativas. Tente novamente em 5 minutos.' },
  keyGenerator: (req) => req.params.tokenId ?? ipKeyGenerator(req),
})
