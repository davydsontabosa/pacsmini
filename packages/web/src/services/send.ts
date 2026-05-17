import { serverClient } from './serverApi'

export interface SendResult {
  success:      boolean
  message:      string
  taskId?:      string
  studiesCount?: number
}

export interface ExportTask {
  taskID:               string
  status:               'SCHEDULED' | 'IN_PROCESS' | 'COMPLETED' | 'FAILED'
  studyInstanceUID:     string
  scheduledTime:        string
  processingStartTime?: string
  completionTime?:      string
  errorMessage?:        string
}

export async function sendStudy(studyUID: string, destinationId: number): Promise<SendResult> {
  const res = await serverClient.post<SendResult>('/api/send/study', { studyUID, destinationId })
  return res.data
}

export async function sendPatient(patientID: string, destinationId: number): Promise<SendResult> {
  const res = await serverClient.post<SendResult>('/api/send/patient', { patientID, destinationId })
  return res.data
}

export async function getSendStatus(studyUID: string): Promise<ExportTask[]> {
  const res = await serverClient.get<{ tasks: ExportTask[] }>(`/api/send/status/${encodeURIComponent(studyUID)}`)
  return res.data.tasks
}
