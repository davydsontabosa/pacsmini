import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../../middleware/auth'
import { env } from '../../config/env'
import { createShare, getAllShares, getSharesByStudy, revokeShare } from './shareStore'
import { sendShareEmail } from '../notifications/emailService'

export const shareRouter = Router()

const CreateShareSchema = z.object({
  studyUid:       z.string(),
  studyDesc:      z.string().optional(),
  patientName:    z.string().optional(),
  patientId:      z.string().optional(),
  modalities:     z.array(z.string()).optional(),
  createdBy:      z.string(),
  recipientEmail: z.string().email().optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
  maxAccesses:    z.number().int().min(1).optional(),
  allowDownload:  z.boolean().optional(),
  password:       z.string().min(4).optional(),
  sendEmail:      z.boolean().optional(),
})

shareRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const input = CreateShareSchema.parse(req.body)
    const token = await createShare(input)
    const shareUrl = `${env.SHARE_BASE_URL}/#/portal/${token.id}`

    if (input.sendEmail && input.recipientEmail) {
      await sendShareEmail({
        recipientEmail: input.recipientEmail,
        shareUrl,
        studyDesc:   input.studyDesc  ?? 'Exame DICOM',
        patientName: input.patientName ?? 'Paciente',
        modalities:  input.modalities  ?? [],
        expiresAt:   new Date(token.expires_at),
        createdBy:   input.createdBy,
        hasPassword: !!input.password,
        password:    input.password,
      })
    }
    res.status(201).json({ ...token, shareUrl })
  } catch (err) { next(err) }
})

shareRouter.get('/', authMiddleware, (_req, res, next) => {
  try {
    const shares = getAllShares(false)
    res.json(shares.map(s => ({
      ...s,
      modalities: s.modalities ? JSON.parse(s.modalities) : [],
      shareUrl:   `${env.SHARE_BASE_URL}/#/portal/${s.id}`,
    })))
  } catch (err) { next(err) }
})

shareRouter.get('/study/:studyUid', authMiddleware, (req, res, next) => {
  try {
    const shares = getSharesByStudy(req.params.studyUid)
    res.json(shares.map(s => ({
      ...s,
      modalities: s.modalities ? JSON.parse(s.modalities) : [],
      shareUrl:   `${env.SHARE_BASE_URL}/#/portal/${s.id}`,
    })))
  } catch (err) { next(err) }
})

shareRouter.delete('/:id', authMiddleware, (req, res, next) => {
  try {
    revokeShare(req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})
