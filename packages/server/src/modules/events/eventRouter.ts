import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { getRecentEvents, recordEvent } from './eventService'

export const eventRouter = Router()

eventRouter.get('/', authMiddleware, (_req, res, next) => {
  try {
    const events = getRecentEvents(100)
    res.json(events)
  } catch (err) { next(err) }
})

eventRouter.post('/', authMiddleware, (req, res, next) => {
  try {
    recordEvent({
      event_type:  String(req.body.eventType ?? 'manual'),
      source_aet:  req.body.sourceAet ?? null,
      patient_id:  req.body.patientId ?? null,
      study_uid:   req.body.studyUid ?? null,
      detail:      req.body.detail ?? null,
      occurred_at: new Date().toISOString(),
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})
