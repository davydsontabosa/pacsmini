import axios from 'axios'
import { useServerStore } from '../store/serverStore'

export const serverClient = axios.create({ timeout: 15_000 })

serverClient.interceptors.request.use((config) => {
  const { serverUrl, apiSecret } = useServerStore.getState()
  config.baseURL = serverUrl
  config.headers['Authorization'] = `Bearer ${apiSecret}`
  return config
})

export interface DiskStatus {
  path:        string
  totalHuman:  string
  usedHuman:   string
  freeHuman:   string
  usedPercent: number
  freePercent: number
  status:      'ok' | 'warning' | 'critical'
}

export async function getDiskStatus(): Promise<DiskStatus> {
  return (await serverClient.get<DiskStatus>('/api/disk/status')).data
}

export interface Alert {
  id:       number
  type:     string
  message:  string
  sent_at:  string
  email_to: string
  resolved: number
}

export async function getAlerts(): Promise<Alert[]> {
  return (await serverClient.get<Alert[]>('/api/notifications')).data
}

export async function testSmtp(testEmail: string): Promise<{ ok: boolean; message: string }> {
  return (await serverClient.post('/api/notifications/smtp-test', { testEmail })).data
}

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

export async function getDicomEvents(): Promise<DicomEvent[]> {
  return (await serverClient.get<DicomEvent[]>('/api/events')).data
}

export interface ShareToken {
  id:              string
  study_uid:       string
  study_desc:      string | null
  patient_name:    string | null
  patient_id:      string | null
  modalities:      string[]
  created_at:      string
  expires_at:      string
  created_by:      string
  recipient_email: string | null
  access_count:    number
  max_accesses:    number | null
  revoked:         number
  allow_download:  number
  shareUrl:        string
}

export interface CreateSharePayload {
  studyUid:        string
  studyDesc?:      string
  patientName?:    string
  patientId?:      string
  modalities?:     string[]
  createdBy:       string
  doctorId?:       number
  recipientEmail?: string
  expiresInHours?: number
  maxAccesses?:    number
  allowDownload?:  boolean
  password?:       string
  sendEmail?:      boolean
}

export interface ShareCreatedResult extends ShareToken {
  shareUrl:    string
  qrDataUrl:   string
  doctorName?: string
}

export async function createShare(payload: CreateSharePayload): Promise<ShareCreatedResult> {
  return (await serverClient.post('/api/shares', payload)).data
}

export async function getShares(): Promise<ShareToken[]> {
  return (await serverClient.get<ShareToken[]>('/api/shares')).data
}

export async function getSharesByStudy(studyUid: string): Promise<ShareToken[]> {
  return (await serverClient.get<ShareToken[]>(`/api/shares/study/${studyUid}`)).data
}

export async function revokeShare(id: string): Promise<void> {
  await serverClient.delete(`/api/shares/${id}`)
}

export const portalClient = axios.create({ timeout: 30_000 })

export interface PortalInfo {
  id:            string
  studyUid:      string
  studyDesc:     string | null
  patientName:   string | null
  modalities:    string[]
  expiresAt:     string
  allowDownload: boolean
  accessCount:   number
  maxAccesses:   number | null
}

export async function getPortalInfo(serverUrl: string, tokenId: string, password?: string): Promise<PortalInfo> {
  const headers: Record<string, string> = {}
  if (password) headers['X-Portal-Password'] = password
  return (await portalClient.get<PortalInfo>(`${serverUrl}/portal/${tokenId}`, { headers })).data
}

export async function getPortalSeries(serverUrl: string, tokenId: string, password?: string): Promise<unknown[]> {
  const headers: Record<string, string> = {}
  if (password) headers['X-Portal-Password'] = password
  return (await portalClient.get(`${serverUrl}/portal/${tokenId}/series`, { headers })).data
}

export function getPortalThumbnailUrl(serverUrl: string, tokenId: string, seriesUid: string, instanceUid: string, rows = 256): string {
  return `${serverUrl}/portal/${tokenId}/thumbnail/${seriesUid}/${instanceUid}?rows=${rows}`
}

export function getPortalDownloadUrl(serverUrl: string, tokenId: string, type: 'study' | 'series', seriesUid?: string): string {
  if (type === 'series' && seriesUid) return `${serverUrl}/portal/${tokenId}/download/series/${seriesUid}`
  return `${serverUrl}/portal/${tokenId}/download/study`
}

export async function checkServerHealth(serverUrl: string): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await axios.get(`${serverUrl}/health`, { timeout: 5000 })
    return { ok: true, version: res.data.version }
  } catch { return { ok: false } }
}
