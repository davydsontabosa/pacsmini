import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/database'
import { authMiddleware as auth } from '../../middleware/auth'
import { strictRateLimit } from '../../middleware/security'
import { env } from '../../config/env'
import { ensureDestinationRegistered } from '../../utils/dcm4cheeDevices'

export const sendRouter = Router()

interface DestRow {
  id:        number
  name:      string
  ae_title:  string
  host:      string
  port:      number
  is_active: number
}

function getActiveDest(destinationId: number): DestRow | null {
  const row = getDb()
    .prepare('SELECT * FROM dicom_destinations WHERE id = ? AND is_active = 1')
    .get(destinationId) as unknown as DestRow | undefined
  return row ?? null
}

function logSend(data: {
  destinationId: number
  studyUid: string
  patientId?: string
  patientName?: string
  sendType: 'study' | 'patient'
  status: 'sent' | 'failed'
  errorMessage?: string
}) {
  getDb().prepare(`
    INSERT INTO dicom_send_log (destination_id, study_uid, patient_id, patient_name, send_type, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.destinationId, data.studyUid,
    data.patientId ?? null, data.patientName ?? null,
    data.sendType, data.status, data.errorMessage ?? null,
  )
}

// POST /api/send/study  (rate limit: 10 req/min em produção)
sendRouter.post('/study', auth, strictRateLimit, async (req, res) => {
  const { studyUID, destinationId } = z.object({
    studyUID:      z.string().min(1),
    destinationId: z.number().int().positive(),
  }).parse(req.body)

  const dest = getActiveDest(destinationId)
  if (!dest) return res.status(404).json({ success: false, message: 'Destino não encontrado ou inativo' })

  const destObj    = { aeTitle: dest.ae_title, host: dest.host, port: dest.port, name: dest.name }
  const dcm4cheeBase = env.DCM4CHEE_BASE_URL
  const localAET     = env.DCM4CHEE_AET
  const creds        = { user: env.DCM4CHEE_USER, pass: env.DCM4CHEE_PASS }
  const authHeader   = {
    Authorization: `Basic ${Buffer.from(`${creds.user}:${creds.pass}`).toString('base64')}`,
  }

  try {
    await ensureDestinationRegistered(destObj, dcm4cheeBase, creds)

    const url = `${dcm4cheeBase}/dcm4chee-arc/aets/${localAET}/rs/studies/${studyUID}/export/dicom:${dest.ae_title}`
    const exportRes = await fetch(url, { method: 'POST', headers: authHeader, signal: AbortSignal.timeout(15000) })

    if (exportRes.ok) {
      logSend({ destinationId, studyUid: studyUID, sendType: 'study', status: 'sent' })
      return res.json({ success: true, message: `Estudo enfileirado para ${dest.ae_title}` })
    } else {
      const body = await exportRes.text().catch(() => '')
      logSend({ destinationId, studyUid: studyUID, sendType: 'study', status: 'failed', errorMessage: `HTTP ${exportRes.status}` })
      return res.json({ success: false, message: `dcm4chee retornou ${exportRes.status}: ${body.slice(0, 200)}` })
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Erro de conexão'
    logSend({ destinationId, studyUid: studyUID, sendType: 'study', status: 'failed', errorMessage: msg })
    return res.json({ success: false, message: msg })
  }
})

// POST /api/send/patient  (rate limit: 10 req/min em produção)
sendRouter.post('/patient', auth, strictRateLimit, async (req, res) => {
  const { patientID, destinationId } = z.object({
    patientID:     z.string().min(1),
    destinationId: z.number().int().positive(),
  }).parse(req.body)

  const dest = getActiveDest(destinationId)
  if (!dest) return res.status(404).json({ success: false, message: 'Destino não encontrado ou inativo' })

  const destObj      = { aeTitle: dest.ae_title, host: dest.host, port: dest.port, name: dest.name }
  const dcm4cheeBase = env.DCM4CHEE_BASE_URL
  const localAET     = env.DCM4CHEE_AET
  const creds        = { user: env.DCM4CHEE_USER, pass: env.DCM4CHEE_PASS }
  const authHeader   = {
    Authorization: `Basic ${Buffer.from(`${creds.user}:${creds.pass}`).toString('base64')}`,
  }

  try {
    await ensureDestinationRegistered(destObj, dcm4cheeBase, creds)

    const url = `${dcm4cheeBase}/dcm4chee-arc/aets/${localAET}/rs/export/dicom:${dest.ae_title}/studies?00100020=${encodeURIComponent(patientID)}`
    const exportRes = await fetch(url, { method: 'POST', headers: authHeader, signal: AbortSignal.timeout(15000) })

    if (exportRes.ok) {
      logSend({ destinationId, studyUid: '*', patientId: patientID, sendType: 'patient', status: 'sent' })
      return res.json({ success: true, message: `Estudos do paciente enfileirados para ${dest.ae_title}` })
    } else {
      const body = await exportRes.text().catch(() => '')
      logSend({ destinationId, studyUid: '*', patientId: patientID, sendType: 'patient', status: 'failed', errorMessage: `HTTP ${exportRes.status}` })
      return res.json({ success: false, message: `dcm4chee retornou ${exportRes.status}: ${body.slice(0, 200)}` })
    }
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Erro de conexão'
    logSend({ destinationId, studyUid: '*', patientId: patientID, sendType: 'patient', status: 'failed', errorMessage: msg })
    return res.json({ success: false, message: msg })
  }
})

// GET /api/send/status/:studyUID
sendRouter.get('/status/:studyUID', auth, async (req, res) => {
  const { studyUID } = req.params
  const dcm4cheeBase = env.DCM4CHEE_BASE_URL
  try {
    const url = `${dcm4cheeBase}/dcm4chee-arc/monitor/export?studyUID=${encodeURIComponent(studyUID)}&limit=5`
    const r   = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return res.json({ tasks: [] })
    const tasks = await r.json()
    return res.json({ tasks })
  } catch {
    return res.json({ tasks: [] })
  }
})
