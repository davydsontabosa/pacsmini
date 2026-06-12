import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/database'
import { authMiddleware as auth } from '../../middleware/auth'
import { strictRateLimit } from '../../middleware/security'
import { env } from '../../config/env'
import { ensureDestinationRegistered } from '../../utils/dcm4cheeDevices'

export const destinationsRouter = Router()

interface DicomDestinationRow {
  id:           number
  name:         string
  ae_title:     string
  host:         string
  port:         number
  description:  string | null
  is_active:    number
  last_echo_at: string | null
  last_echo_ok: number
  created_at:   string
  updated_at:   string
}

function mapRow(row: DicomDestinationRow) {
  return {
    id:          row.id,
    name:        row.name,
    aeTitle:     row.ae_title,
    host:        row.host,
    port:        row.port,
    description: row.description,
    isActive:    row.is_active === 1,
    lastEchoAt:  row.last_echo_at,
    lastEchoOk:  row.last_echo_ok === 1,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  aeTitle:     z.string().min(1).max(16).transform(v => v.toUpperCase()),
  host:        z.string().min(1),
  port:        z.number().int().min(1).max(65535),
  description: z.string().max(300).optional(),
  isActive:    z.boolean().optional(),
})

const updateSchema = createSchema.partial()

// GET /api/destinations
destinationsRouter.get('/', auth, (_req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM dicom_destinations ORDER BY name ASC')
    .all() as unknown as DicomDestinationRow[]
  res.json(rows.map(mapRow))
})

// POST /api/destinations
destinationsRouter.post('/', auth, (req, res) => {
  const data = createSchema.parse(req.body)
  const db   = getDb()
  const now  = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO dicom_destinations (name, ae_title, host, port, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(data.name, data.aeTitle, data.host, data.port,
         data.description ?? null, data.isActive !== false ? 1 : 0, now, now)
  const row = db.prepare('SELECT * FROM dicom_destinations WHERE id = ?')
    .get(result.lastInsertRowid) as unknown as DicomDestinationRow
  const mapped = mapRow(row)
  // Registra o AE no dcm4chee em background (não bloqueia a resposta)
  ensureDestinationRegistered(mapped, env.DCM4CHEE_BASE_URL, { user: env.DCM4CHEE_USER, pass: env.DCM4CHEE_PASS }).catch(() => {})
  res.status(201).json(mapped)
})

// PUT /api/destinations/:id
destinationsRouter.put('/:id', auth, (req, res) => {
  const id   = Number(req.params.id)
  const data = updateSchema.parse(req.body)
  const db   = getDb()
  const existing = db.prepare('SELECT * FROM dicom_destinations WHERE id = ?')
    .get(id) as unknown as DicomDestinationRow | undefined
  if (!existing) return res.status(404).json({ error: 'Destino não encontrado' })

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE dicom_destinations SET
      name        = ?,
      ae_title    = ?,
      host        = ?,
      port        = ?,
      description = ?,
      is_active   = ?,
      updated_at  = ?
    WHERE id = ?
  `).run(
    data.name        ?? existing.name,
    data.aeTitle     ?? existing.ae_title,
    data.host        ?? existing.host,
    data.port        ?? existing.port,
    data.description !== undefined ? (data.description ?? null) : existing.description,
    data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active,
    now, id,
  )
  const row = db.prepare('SELECT * FROM dicom_destinations WHERE id = ?')
    .get(id) as unknown as DicomDestinationRow
  const mapped = mapRow(row)
  // Re-registra no dcm4chee caso host/porta/AET tenham mudado
  ensureDestinationRegistered(mapped, env.DCM4CHEE_BASE_URL, { user: env.DCM4CHEE_USER, pass: env.DCM4CHEE_PASS }).catch(() => {})
  return res.json(mapped)
})

// DELETE /api/destinations/:id
destinationsRouter.delete('/:id', auth, (req, res) => {
  const id = Number(req.params.id)
  const db = getDb()
  const existing = db.prepare('SELECT id FROM dicom_destinations WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Destino não encontrado' })
  db.prepare('DELETE FROM dicom_destinations WHERE id = ?').run(id)
  return res.json({ deleted: true })
})

// POST /api/destinations/import  — importa devices/AEs do dcm4chee
destinationsRouter.post('/import', auth, async (_req, res) => {
  const dcm4cheeBase = env.DCM4CHEE_BASE_URL
  const authHeader   = {
    Authorization: `Basic ${Buffer.from(`${env.DCM4CHEE_USER}:${env.DCM4CHEE_PASS}`).toString('base64')}`,
  }
  const db = getDb()

  // 1. Lista todos os devices registrados no dcm4chee
  let deviceNames: string[]
  try {
    const r = await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices`, {
      headers: authHeader,
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) {
      return res.status(502).json({ error: `dcm4chee respondeu ${r.status} ao listar devices` })
    }
    deviceNames = (await r.json()) as string[]
  } catch (err) {
    return res.status(502).json({ error: 'Não foi possível conectar ao dcm4chee' })
  }

  const imported: string[] = []
  const skipped:  string[] = []
  const errors:   string[] = []
  const now = new Date().toISOString()

  // 2. Para cada device, busca detalhes e extrai AE Title + host + porta
  for (const deviceName of deviceNames) {
    try {
      const dr = await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${encodeURIComponent(deviceName)}`, {
        headers: authHeader,
        signal: AbortSignal.timeout(8000),
      })
      if (!dr.ok) continue

      const device = await dr.json() as {
        dicomDeviceName?: string
        dicomDescription?: string
        dicomInstalled?: boolean
        dicomNetworkAE?: Array<{
          dicomAETitle?: string
          dicomAssociationAcceptor?: boolean
          dicomNetworkConnectionReference?: string[]
        }>
        dicomNetworkConnection?: Array<{
          cn?: string
          dicomHostname?: string
          dicomPort?: number
        }>
      }

      const aes = device.dicomNetworkAE ?? []
      const connections = device.dicomNetworkConnection ?? []

      for (const ae of aes) {
        const aeTitle = ae.dicomAETitle?.toUpperCase()
        if (!aeTitle) continue

        // Resolve a conexão de rede associada a este AE
        const connRef = ae.dicomNetworkConnectionReference?.[0] ?? ''
        const connIdx = connRef.match(/\/dicomNetworkConnection\/(\d+)/)?.[1]
        const conn = connIdx !== undefined
          ? connections[Number(connIdx)]
          : connections[0]

        const host = conn?.dicomHostname
        const port = conn?.dicomPort ?? 104

        if (!host || host === 'localhost' || host === '127.0.0.1') continue

        // Verifica se já existe no banco
        const existing = db.prepare('SELECT id FROM dicom_destinations WHERE ae_title = ?').get(aeTitle)
        if (existing) {
          skipped.push(aeTitle)
          continue
        }

        const name = device.dicomDescription ?? device.dicomDeviceName ?? aeTitle

        db.prepare(`
          INSERT INTO dicom_destinations (name, ae_title, host, port, description, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(name, aeTitle, host, port, `Importado de ${deviceName}`, now, now)

        imported.push(aeTitle)
      }
    } catch {
      errors.push(deviceName)
    }
  }

  return res.json({ imported, skipped, errors })
})

// POST /api/destinations/:id/echo  (rate limit: 10 req/min em produção)
destinationsRouter.post('/:id/echo', auth, strictRateLimit, async (req, res) => {
  const id  = Number(req.params.id)
  const db  = getDb()
  const row = db.prepare('SELECT * FROM dicom_destinations WHERE id = ?')
    .get(id) as unknown as DicomDestinationRow | undefined
  if (!row) return res.status(404).json({ error: 'Destino não encontrado' })

  const dest = mapRow(row)
  const dcm4cheeBase = env.DCM4CHEE_BASE_URL
  const localAET     = env.DCM4CHEE_AET
  const now          = new Date().toISOString()

  try {
    await ensureDestinationRegistered(dest, dcm4cheeBase, { user: env.DCM4CHEE_USER, pass: env.DCM4CHEE_PASS })

    const start = Date.now()
    const echoRes = await fetch(
      `${dcm4cheeBase}/dcm4chee-arc/aets/${localAET}/dimse/${dest.aeTitle}`,
      { method: 'POST', signal: AbortSignal.timeout(10000) }
    )
    const responseTime = Date.now() - start

    if (echoRes.ok) {
      db.prepare('UPDATE dicom_destinations SET last_echo_at = ?, last_echo_ok = 1, updated_at = ? WHERE id = ?')
        .run(now, now, id)
      return res.json({ success: true, message: `C-ECHO OK (${responseTime}ms)`, responseTime })
    } else {
      db.prepare('UPDATE dicom_destinations SET last_echo_ok = 0, updated_at = ? WHERE id = ?').run(now, id)
      return res.json({ success: false, message: `Servidor respondeu com erro: ${echoRes.status}`, responseTime })
    }
  } catch (err: unknown) {
    db.prepare('UPDATE dicom_destinations SET last_echo_ok = 0, updated_at = ? WHERE id = ?').run(now, id)
    const e = err as Error & { name?: string }
    if (e.name === 'TimeoutError') {
      return res.json({ success: false, message: 'Timeout: servidor não respondeu em 10 segundos', responseTime: 10000 })
    }
    return res.json({ success: false, message: e.message || 'Erro de conexão', responseTime: 0 })
  }
})
