import { Router, Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { env } from '../../config/env'
import { portalRateLimit } from '../../middleware/security'
import { getShareById, isShareValid, verifySharePassword, incrementAccess } from '../shares/shareStore'

export const portalRouter = Router()

portalRouter.use(portalRateLimit)

type ReqWithToken = Request & { shareToken: NonNullable<ReturnType<typeof getShareById>> }

async function resolveToken(req: Request, res: Response, next: NextFunction) {
  const token = getShareById(req.params.tokenId)
  if (!token) return res.status(404).json({ error: 'Link não encontrado' })

  const validity = isShareValid(token)
  if (!validity.valid) return res.status(410).json({ error: validity.reason })

  if (token.password_hash) {
    const provided = req.headers['x-portal-password']
    if (!provided) return res.status(401).json({ requiresPassword: true })
    const ok = await verifySharePassword(token, String(provided))
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' })
  }

  ;(req as ReqWithToken).shareToken = token
  next()
}

portalRouter.get('/:tokenId', resolveToken, (req, res) => {
  const token = (req as ReqWithToken).shareToken
  incrementAccess(token.id, req.ip ?? '', req.headers['user-agent'] ?? '', 'view')
  res.json({
    id:            token.id,
    studyUid:      token.study_uid,
    studyDesc:     token.study_desc,
    patientName:   token.patient_name,
    patientId:     token.patient_id,
    modalities:    token.modalities ? JSON.parse(token.modalities) : [],
    expiresAt:     token.expires_at,
    allowDownload: token.allow_download === 1,
    accessCount:   token.access_count + 1,
    maxAccesses:   token.max_accesses,
  })
})

portalRouter.get('/:tokenId/series', resolveToken, async (req, res, next) => {
  const token = (req as ReqWithToken).shareToken
  try {
    const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${token.study_uid}/series`
    const r = await axios.get(url, { headers: { Accept: 'application/dicom+json' }, timeout: 10000 })
    res.json(r.data)
  } catch (err) { next(err) }
})

portalRouter.get('/:tokenId/instances/:seriesUid', resolveToken, async (req, res, next) => {
  const token = (req as ReqWithToken).shareToken
  try {
    const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${token.study_uid}/series/${req.params.seriesUid}/instances`
    const r = await axios.get(url, { headers: { Accept: 'application/dicom+json' }, timeout: 10000 })
    res.json(r.data)
  } catch (err) { next(err) }
})

portalRouter.get('/:tokenId/thumbnail/:seriesUid/:instanceUid', resolveToken, async (req, res, next) => {
  const token = (req as ReqWithToken).shareToken
  try {
    const r = await axios.get(`${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/wado`, {
      params: {
        requestType: 'WADO',
        studyUID:    token.study_uid,
        seriesUID:   req.params.seriesUid,
        objectUID:   req.params.instanceUid,
        contentType: 'image/jpeg',
        rows: Number(req.query.rows) || 256,
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    })
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(r.data)
  } catch (err) { next(err) }
})

portalRouter.get('/:tokenId/download/study', resolveToken, async (req, res, next) => {
  const token = (req as ReqWithToken).shareToken
  if (!token.allow_download) return res.status(403).json({ error: 'Download não permitido' })
  try {
    const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${token.study_uid}`
    const r = await axios.get(url, { headers: { Accept: 'application/zip' }, responseType: 'stream', timeout: 120_000 })
    const safeDesc = (token.study_desc ?? 'exame').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="${safeDesc}.zip"`)
    if (r.headers['content-length']) res.set('Content-Length', r.headers['content-length'])
    incrementAccess(token.id, req.ip ?? '', req.headers['user-agent'] ?? '', 'download_study')
    r.data.pipe(res)
  } catch (err) { next(err) }
})

portalRouter.get('/:tokenId/download/series/:seriesUid', resolveToken, async (req, res, next) => {
  const token = (req as ReqWithToken).shareToken
  if (!token.allow_download) return res.status(403).json({ error: 'Download não permitido' })
  try {
    const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${token.study_uid}/series/${req.params.seriesUid}`
    const r = await axios.get(url, { headers: { Accept: 'application/zip' }, responseType: 'stream', timeout: 60_000 })
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="serie_${req.params.seriesUid.slice(-8)}.zip"`)
    if (r.headers['content-length']) res.set('Content-Length', r.headers['content-length'])
    incrementAccess(token.id, req.ip ?? '', req.headers['user-agent'] ?? '', 'download_series')
    r.data.pipe(res)
  } catch (err) { next(err) }
})
