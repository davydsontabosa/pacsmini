import { getDb } from '../../db/database'

interface Alert {
  id:          number
  type:        string
  message:     string
  sent_at:     string
  email_to:    string
  resolved:    number
  resolved_at: string | null
}

export function saveAlert(data: Pick<Alert, 'type' | 'message' | 'email_to'>) {
  const db = getDb()
  db.prepare(`
    INSERT INTO alerts (type, message, sent_at, email_to)
    VALUES (?, ?, ?, ?)
  `).run(data.type, data.message, new Date().toISOString(), data.email_to)
}

export function getLastAlertByType(type: string): Alert | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM alerts WHERE type = ? ORDER BY sent_at DESC LIMIT 1
  `).get(type) as unknown as Alert | undefined
  return row ?? null
}

export function getAlerts(types?: string[]): Alert[] {
  const db = getDb()
  if (types && types.length > 0) {
    const placeholders = types.map(() => '?').join(',')
    return db.prepare(
      `SELECT * FROM alerts WHERE type IN (${placeholders}) ORDER BY sent_at DESC LIMIT 100`
    ).all(...types) as unknown as Alert[]
  }
  return db.prepare(`SELECT * FROM alerts ORDER BY sent_at DESC LIMIT 100`).all() as unknown as Alert[]
}
