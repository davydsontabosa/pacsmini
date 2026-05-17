import { serverClient } from './serverApi'

export interface DicomDestination {
  id:          number
  name:        string
  aeTitle:     string
  host:        string
  port:        number
  description: string | null
  isActive:    boolean
  lastEchoAt:  string | null
  lastEchoOk:  boolean
  createdAt:   string
  updatedAt:   string
}

export interface CreateDestinationInput {
  name:        string
  aeTitle:     string
  host:        string
  port:        number
  description?: string
  isActive?:   boolean
}

export interface EchoResult {
  success:      boolean
  message:      string
  responseTime: number
}

export async function getDestinations(): Promise<DicomDestination[]> {
  const res = await serverClient.get<DicomDestination[]>('/api/destinations')
  return res.data
}

export async function createDestination(data: CreateDestinationInput): Promise<DicomDestination> {
  const res = await serverClient.post<DicomDestination>('/api/destinations', data)
  return res.data
}

export async function updateDestination(id: number, data: Partial<CreateDestinationInput>): Promise<DicomDestination> {
  const res = await serverClient.put<DicomDestination>(`/api/destinations/${id}`, data)
  return res.data
}

export async function deleteDestination(id: number): Promise<void> {
  await serverClient.delete(`/api/destinations/${id}`)
}

export async function testEcho(id: number): Promise<EchoResult> {
  const res = await serverClient.post<EchoResult>(`/api/destinations/${id}/echo`)
  return res.data
}
