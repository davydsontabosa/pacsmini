import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { sendDiskAlert } from './emailService'
import { getDiskStatus } from '../disk/diskService'
import { getAlerts } from './alertStore'
import { env } from '../../config/env'

export const notifyRouter = Router()

notifyRouter.get('/', authMiddleware, (_req, res, next) => {
  try {
    const alerts = getAlerts()
    res.json(alerts)
  } catch (err) { next(err) }
})

notifyRouter.post('/test-disk', authMiddleware, async (_req, res, next) => {
  try {
    const disk = await getDiskStatus()
    const recipients = env.EMAIL_ALERT_TO.split(',').map(e => e.trim())
    await sendDiskAlert({ ...disk, status: 'warning' }, recipients)
    res.json({ ok: true, message: 'Email de teste enviado', recipients })
  } catch (err) { next(err) }
})

notifyRouter.post('/smtp-test', authMiddleware, async (req, res, next) => {
  try {
    const disk = await getDiskStatus()
    const testEmail = String(req.body?.testEmail || env.EMAIL_ALERT_TO.split(',')[0])
    await sendDiskAlert({ ...disk, status: 'warning' }, [testEmail])
    res.json({ ok: true, message: `Email de teste enviado para ${testEmail}` })
  } catch (err) { next(err) }
})
