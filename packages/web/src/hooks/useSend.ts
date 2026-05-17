import { useMutation } from '@tanstack/react-query'
import { sendStudy, sendPatient } from '../services/send'

export function useSendStudy() {
  return useMutation({
    mutationFn: ({ studyUID, destinationId }: { studyUID: string; destinationId: number }) =>
      sendStudy(studyUID, destinationId),
  })
}

export function useSendPatient() {
  return useMutation({
    mutationFn: ({ patientID, destinationId }: { patientID: string; destinationId: number }) =>
      sendPatient(patientID, destinationId),
  })
}
