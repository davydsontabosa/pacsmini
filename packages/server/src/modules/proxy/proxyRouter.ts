import { Router } from 'express'
import axios from 'axios'
import { authMiddleware } from '../../middleware/auth'
import { env } from '../../config/env'

export const proxyRouter = Router()

function dcm4cheeAuth() {
  return `Basic ${Buffer.from(`${env.DCM4CHEE_USER}:${env.DCM4CHEE_PASS}`).toString('base64')}`
}

// GET /api/proxy/download/study/:studyUID
proxyRouter.get('/download/study/:studyUID', authMiddleware, async (req, res, next) => {
  const { studyUID } = req.params
  const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${studyUID}`
  try {
    const r = await axios.get(url, {
      headers: { Accept: 'application/zip', Authorization: dcm4cheeAuth() },
      responseType: 'stream',
      timeout: 120_000,
    })
    const safeUid = studyUID.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64)
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="study_${safeUid}.zip"`)
    if (r.headers['content-length']) res.set('Content-Length', r.headers['content-length'])
    r.data.pipe(res)
  } catch (err) { next(err) }
})

// GET /api/proxy/download/series/:studyUID/:seriesUID
proxyRouter.get('/download/series/:studyUID/:seriesUID', authMiddleware, async (req, res, next) => {
  const { studyUID, seriesUID } = req.params
  const url = `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/aets/${env.DCM4CHEE_AET}/rs/studies/${studyUID}/series/${seriesUID}`
  try {
    const r = await axios.get(url, {
      headers: { Accept: 'application/zip', Authorization: dcm4cheeAuth() },
      responseType: 'stream',
      timeout: 60_000,
    })
    const safeUid = seriesUID.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-16)
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="series_${safeUid}.zip"`)
    if (r.headers['content-length']) res.set('Content-Length', r.headers['content-length'])
    r.data.pipe(res)
  } catch (err) { next(err) }
})
