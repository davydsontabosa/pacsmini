import { getDb } from '../../db/database'

export interface DicomEvent {
  id:          number
  event_type:  string
  source_aet:  string | null
  patient_id:  string | null
  study_uid:   string | null
  detail:      string | null
  occurred_at: string
  notified:    number
}

export function recordEvent(data: Omit<DicomEvent, 'id' | 'notified'>) {
  const db = getDb()
  // Deduplicate: same event_type + study_uid + detail within the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const exists = db.prepare(`
    SELECT id FROM dicom_events
    WHERE event_type = ? AND study_uid = ? AND detail = ? AND occurred_at > ?
  `).get(data.event_type, data.study_uid ?? '', data.detail ?? '', since)
  if (exists) return
  db.prepare(`
    INSERT INTO dicom_events (event_type, source_aet, patient_id, study_uid, detail, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.event_type, data.source_aet, data.patient_id, data.study_uid, data.detail, data.occurred_at)
}

export function getPendingErrors(sinceMinutes = 60): DicomEvent[] {
  const db = getDb()
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString()
  return db.prepare(`
    SELECT * FROM dicom_events WHERE notified = 0 AND occurred_at > ? ORDER BY occurred_at DESC
  `).all(since) as unknown as DicomEvent[]
}

export function markNotified(ids: number[]) {
  const db = getDb()
  const stmt = db.prepare(`UPDATE dicom_events SET notified = 1 WHERE id = ?`)
  ids.forEach(id => stmt.run(id))
}

export function getRecentEvents(limit = 50): DicomEvent[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM dicom_events ORDER BY occurred_at DESC LIMIT ?`).all(limit) as unknown as DicomEvent[]
}
