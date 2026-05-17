import { getDb } from '../../db/database'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env'

export interface ShareToken {
  id:               string
  study_uid:        string
  study_desc:       string | null
  patient_name:     string | null
  patient_id:       string | null
  modalities:       string | null
  created_at:       string
  expires_at:       string
  created_by:       string
  recipient_email:  string | null
  access_count:     number
  max_accesses:     number | null
  revoked:          number
  revoked_at:       string | null
  allow_download:   number
  password_hash:    string | null
}

export interface CreateShareInput {
  studyUid:        string
  studyDesc?:      string
  patientName?:    string
  patientId?:      string
  modalities?:     string[]
  createdBy:       string
  recipientEmail?: string
  expiresInHours?: number
  maxAccesses?:    number
  allowDownload?:  boolean
  password?:       string
}

export async function createShare(input: CreateShareInput): Promise<ShareToken> {
  const db = getDb()
  const id = nanoid(12)
  const now = new Date()
  const expiresH = input.expiresInHours ?? parseInt(env.SHARE_DEFAULT_EXPIRES_H, 10)
  const expiresAt = new Date(now.getTime() + expiresH * 60 * 60 * 1000)
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null

  db.prepare(`
    INSERT INTO share_tokens
      (id, study_uid, study_desc, patient_name, patient_id, modalities,
       created_at, expires_at, created_by, recipient_email,
       max_accesses, allow_download, password_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, input.studyUid, input.studyDesc ?? null, input.patientName ?? null,
    input.patientId ?? null, input.modalities ? JSON.stringify(input.modalities) : null,
    now.toISOString(), expiresAt.toISOString(), input.createdBy,
    input.recipientEmail ?? null, input.maxAccesses ?? null,
    input.allowDownload !== false ? 1 : 0, passwordHash
  )
  return getShareById(id)!
}

export function getShareById(id: string): ShareToken | null {
  const db = getDb()
  return db.prepare(`SELECT * FROM share_tokens WHERE id = ?`).get(id) as unknown as ShareToken ?? null
}

export function getSharesByStudy(studyUid: string): ShareToken[] {
  const db = getDb()
  return db.prepare(
    `SELECT * FROM share_tokens WHERE study_uid = ? ORDER BY created_at DESC`
  ).all(studyUid) as unknown as ShareToken[]
}

export function getAllShares(includeExpired = false): ShareToken[] {
  const db = getDb()
  if (includeExpired) {
    return db.prepare(`SELECT * FROM share_tokens ORDER BY created_at DESC`).all() as unknown as ShareToken[]
  }
  return db.prepare(`
    SELECT * FROM share_tokens WHERE revoked = 0 AND expires_at > ? ORDER BY created_at DESC
  `).all(new Date().toISOString()) as unknown as ShareToken[]
}

export function revokeShare(id: string) {
  const db = getDb()
  db.prepare(`UPDATE share_tokens SET revoked = 1, revoked_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), id)
}

export function incrementAccess(id: string, ip: string, userAgent: string, action: string) {
  const db = getDb()
  db.prepare(`UPDATE share_tokens SET access_count = access_count + 1 WHERE id = ?`).run(id)
  db.prepare(`
    INSERT INTO share_access_log (token_id, accessed_at, ip_address, user_agent, action)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, new Date().toISOString(), ip, userAgent, action)
}

export async function verifySharePassword(token: ShareToken, password: string): Promise<boolean> {
  if (!token.password_hash) return true
  return bcrypt.compare(password, token.password_hash)
}

export function isShareValid(token: ShareToken): { valid: boolean; reason?: string } {
  if (token.revoked) return { valid: false, reason: 'Link revogado' }
  if (new Date(token.expires_at) < new Date()) return { valid: false, reason: 'Link expirado' }
  if (token.max_accesses && token.access_count >= token.max_accesses) {
    return { valid: false, reason: 'Limite de acessos atingido' }
  }
  return { valid: true }
}
