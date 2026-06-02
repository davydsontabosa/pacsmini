import { Router } from 'express'
import { z } from 'zod'
import QRCode from 'qrcode'
import { authMiddleware } from '../../middleware/auth'
import { env } from '../../config/env'
import { getDb } from '../../db/database'
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
  doctorId:       z.number().int().positive().optional(),
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

    // Resolve email do médico quando doctorId fornecido
    let resolvedEmail = input.recipientEmail
    let doctorName: string | undefined
    if (input.doctorId) {
      const doctor = getDb()
        .prepare('SELECT name, email FROM doctors WHERE id = ? AND is_active = 1')
        .get(input.doctorId) as { name: string; email: string } | undefined
      if (!doctor) return res.status(404).json({ error: 'Médico não encontrado ou inativo' })
      if (!resolvedEmail && doctor.email) resolvedEmail = doctor.email
      doctorName = doctor.name
    }

    const token    = await createShare({ ...input, recipientEmail: resolvedEmail })
    const shareUrl = `${env.SHARE_BASE_URL}/#/portal/${token.id}`

    // Gera QR code como data URL (PNG base64)
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width:          300,
      margin:         2,
      color:          { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    if (input.sendEmail !== false && resolvedEmail) {
      await sendShareEmail({
        recipientEmail: resolvedEmail,
        shareUrl,
        qrDataUrl,
        studyDesc:    input.studyDesc   ?? 'Exame DICOM',
        patientName:  input.patientName ?? 'Paciente',
        modalities:   input.modalities  ?? [],
        expiresAt:    new Date(token.expires_at),
        createdBy:    doctorName ? `${input.createdBy} → ${doctorName}` : input.createdBy,
        hasPassword:  !!input.password,
        password:     input.password,
      })
    }

    res.status(201).json({ ...token, shareUrl, qrDataUrl, doctorName })
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
