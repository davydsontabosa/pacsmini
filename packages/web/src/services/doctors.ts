import { serverClient } from './serverApi'

export interface Doctor {
  id:             number
  name:           string
  crm:            string
  email:          string
  phone:          string
  specialization: string
  modalities:     string[]
  isActive:       boolean
  patientCount?:  number
  createdAt:      string
  updatedAt:      string
}

export interface DoctorPatientAssignment {
  id:          number
  doctorId:    number
  patientId:   string
  patientName: string
  assignedBy:  string
  assignedAt:  string
}

export interface CreateDoctorInput {
  name:           string
  crm:            string
  email?:         string
  phone?:         string
  specialization?: string
  modalities:     string[]
  isActive:       boolean
}

export async function getDoctors(): Promise<Doctor[]> {
  const res = await serverClient.get<Doctor[]>('/api/doctors')
  return res.data
}

export async function getDoctor(id: number): Promise<Doctor> {
  const res = await serverClient.get<Doctor>(`/api/doctors/${id}`)
  return res.data
}

export async function createDoctor(data: CreateDoctorInput): Promise<Doctor> {
  const res = await serverClient.post<Doctor>('/api/doctors', data)
  return res.data
}

export async function updateDoctor(id: number, data: CreateDoctorInput): Promise<Doctor> {
  const res = await serverClient.put<Doctor>(`/api/doctors/${id}`, data)
  return res.data
}

export async function deleteDoctor(id: number): Promise<void> {
  await serverClient.delete(`/api/doctors/${id}`)
}

export async function getDoctorPatients(doctorId: number): Promise<DoctorPatientAssignment[]> {
  const res = await serverClient.get<DoctorPatientAssignment[]>(`/api/doctors/${doctorId}/patients`)
  return res.data
}

export async function assignPatient(doctorId: number, patientId: string, patientName?: string): Promise<void> {
  await serverClient.post(`/api/doctors/${doctorId}/patients`, { patientId, patientName })
}

export async function unassignPatient(doctorId: number, patientId: string): Promise<void> {
  await serverClient.delete(`/api/doctors/${doctorId}/patients/${encodeURIComponent(patientId)}`)
}
