import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor,
  getDoctorPatients, assignPatient, unassignPatient,
  CreateDoctorInput,
} from '../services/doctors'
import { useServerStore } from '../store/serverStore'

const KEY = 'doctors'

export function useDoctors() {
  const { isConfigured } = useServerStore()
  return useQuery({
    queryKey: [KEY],
    queryFn:  getDoctors,
    enabled:  isConfigured,
  })
}

export function useDoctor(id: number | null) {
  const { isConfigured } = useServerStore()
  return useQuery({
    queryKey: [KEY, id],
    queryFn:  () => getDoctor(id!),
    enabled:  isConfigured && id != null,
  })
}

export function useDoctorPatients(doctorId: number | null) {
  const { isConfigured } = useServerStore()
  return useQuery({
    queryKey: [KEY, doctorId, 'patients'],
    queryFn:  () => getDoctorPatients(doctorId!),
    enabled:  isConfigured && doctorId != null,
  })
}

export function useCreateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDoctorInput) => createDoctor(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateDoctorInput }) => updateDoctor(id, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDoctor(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useAssignPatient(doctorId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, patientName }: { patientId: string; patientName?: string }) =>
      assignPatient(doctorId!, patientId, patientName),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, doctorId, 'patients'] }),
  })
}

export function useUnassignPatient(doctorId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patientId: string) => unassignPatient(doctorId!, patientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, doctorId, 'patients'] })
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}
