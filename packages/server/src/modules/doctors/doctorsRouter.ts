import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/database'
import { authMiddleware as auth } from '../../middleware/auth'

export const doctorsRouter = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const DoctorSchema = z.object({
  name:           z.string().min(1).max(120),
  crm:            z.string().min(1).max(30),
  email:          z.string().email().optional().or(z.literal('')),
  phone:          z.string().max(20).optional().or(z.literal('')),
  specialization: z.string().max(80).optional().or(z.literal('')),
  modalities:     z.array(z.string()).default([]),
  isActive:       z.boolean().default(true),
})

const AssignSchema = z.object({
  patientId:   z.string().min(1),
  patientName: z.string().optional().or(z.literal('')),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

function rowToDoctor(r: Record<string, unknown>) {
  return {
    id:             r.id,
    name:           r.name,
    crm:            r.crm,
    email:          r.email  || '',
    phone:          r.phone  || '',
    specialization: r.specialization || '',
    modalities:     JSON.parse((r.modalities as string) || '[]') as string[],
    isActive:       r.is_active === 1,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  }
}

// ─── GET /api/doctors ─────────────────────────────────────────────────────────

doctorsRouter.get('/', auth, (_req, res, next) => {
  try {
    const db   = getDb()
    const rows = db.prepare(`
      SELECT d.*,
             COUNT(a.id) AS patient_count
        FROM doctors d
        LEFT JOIN doctor_patient_assignments a ON a.doctor_id = d.id
       GROUP BY d.id
       ORDER BY d.name ASC
    `).all() as Record<string, unknown>[]

    res.json(rows.map(r => ({ ...rowToDoctor(r), patientCount: r.patient_count })))
  } catch (err) { next(err) }
})

// ─── GET /api/doctors/:id ─────────────────────────────────────────────────────

doctorsRouter.get('/:id', auth, (req, res, next) => {
  try {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) return res.status(404).json({ error: 'Médico não encontrado' })
    res.json(rowToDoctor(row))
  } catch (err) { next(err) }
})

// ─── POST /api/doctors ────────────────────────────────────────────────────────

doctorsRouter.post('/', auth, (req, res, next) => {
  try {
    const body = DoctorSchema.parse(req.body)
    const db   = getDb()

    const result = db.prepare(`
      INSERT INTO doctors (name, crm, email, phone, specialization, modalities, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.name,
      body.crm.toUpperCase(),
      body.email          || '',
      body.phone          || '',
      body.specialization || '',
      JSON.stringify(body.modalities),
      body.isActive ? 1 : 0,
    )

    const created = db.prepare('SELECT * FROM doctors WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    res.status(201).json(rowToDoctor(created))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'CRM já cadastrado' })
    }
    next(err)
  }
})

// ─── PUT /api/doctors/:id ─────────────────────────────────────────────────────

doctorsRouter.put('/:id', auth, (req, res, next) => {
  try {
    const body = DoctorSchema.parse(req.body)
    const db   = getDb()

    const existing = db.prepare('SELECT id FROM doctors WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Médico não encontrado' })

    db.prepare(`
      UPDATE doctors SET
        name = ?, crm = ?, email = ?, phone = ?, specialization = ?,
        modalities = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.name,
      body.crm.toUpperCase(),
      body.email          || '',
      body.phone          || '',
      body.specialization || '',
      JSON.stringify(body.modalities),
      body.isActive ? 1 : 0,
      req.params.id,
    )

    const updated = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id) as Record<string, unknown>
    res.json(rowToDoctor(updated))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'CRM já cadastrado' })
    }
    next(err)
  }
})

// ─── DELETE /api/doctors/:id ──────────────────────────────────────────────────

doctorsRouter.delete('/:id', auth, (req, res, next) => {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT id FROM doctors WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Médico não encontrado' })

    db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id)
    res.status(204).end()
  } catch (err) { next(err) }
})

// ─── GET /api/doctors/:id/patients ────────────────────────────────────────────

doctorsRouter.get('/:id/patients', auth, (req, res, next) => {
  try {
    const db = getDb()
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(req.params.id)
    if (!doctor) return res.status(404).json({ error: 'Médico não encontrado' })

    const assignments = db.prepare(`
      SELECT * FROM doctor_patient_assignments
      WHERE doctor_id = ?
      ORDER BY assigned_at DESC
    `).all(req.params.id) as Record<string, unknown>[]

    res.json(assignments.map(a => ({
      id:          a.id,
      doctorId:    a.doctor_id,
      patientId:   a.patient_id,
      patientName: a.patient_name || '',
      assignedBy:  a.assigned_by,
      assignedAt:  a.assigned_at,
    })))
  } catch (err) { next(err) }
})

// ─── POST /api/doctors/:id/patients ───────────────────────────────────────────

doctorsRouter.post('/:id/patients', auth, (req, res, next) => {
  try {
    const body   = AssignSchema.parse(req.body)
    const db     = getDb()
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(req.params.id)
    if (!doctor) return res.status(404).json({ error: 'Médico não encontrado' })

    // INSERT OR IGNORE to handle duplicates gracefully
    db.prepare(`
      INSERT OR IGNORE INTO doctor_patient_assignments (doctor_id, patient_id, patient_name)
      VALUES (?, ?, ?)
    `).run(req.params.id, body.patientId, body.patientName || '')

    res.status(201).json({ ok: true, patientId: body.patientId })
  } catch (err) { next(err) }
})

// ─── DELETE /api/doctors/:id/patients/:patientId ──────────────────────────────

doctorsRouter.delete('/:id/patients/:patientId', auth, (req, res, next) => {
  try {
    const db = getDb()
    db.prepare(`
      DELETE FROM doctor_patient_assignments
      WHERE doctor_id = ? AND patient_id = ?
    `).run(req.params.id, req.params.patientId)
    res.status(204).end()
  } catch (err) { next(err) }
})
