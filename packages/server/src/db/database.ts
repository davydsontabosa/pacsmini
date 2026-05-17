import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { env } from '../config/env'

let db: InstanceType<typeof DatabaseSync>

export function initDatabase() {
  const dbDir = path.dirname(env.DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  db = new DatabaseSync(env.DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')

  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)

  console.log(`[DB] SQLite inicializado em: ${env.DB_PATH}`)
}

export function getDb(): InstanceType<typeof DatabaseSync> {
  if (!db) throw new Error('[DB] Banco não inicializado — chame initDatabase() primeiro')
  return db
}

export function getSetting(key: string): string | null {
  const stmt = getDb().prepare('SELECT value FROM settings WHERE key = ?')
  const row = stmt.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}
