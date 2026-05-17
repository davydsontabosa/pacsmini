import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { getDiskStatus } from './diskService'
import { getAlerts } from '../notifications/alertStore'

export const diskRouter = Router()

diskRouter.get('/status', authMiddleware, async (_req, res, next) => {
  try {
    const status = await getDiskStatus()
    res.json(status)
  } catch (err) { next(err) }
})

diskRouter.get('/alerts', authMiddleware, (_req, res, next) => {
  try {
    const alerts = getAlerts(['disk_warning', 'disk_critical'])
    res.json(alerts)
  } catch (err) { next(err) }
})
