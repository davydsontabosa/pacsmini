import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDestinations, createDestination, updateDestination,
  deleteDestination, testEcho, importFromDcm4chee, CreateDestinationInput,
} from '../services/destinations'

export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn:  getDestinations,
  })
}

export function useCreateDestination() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDestination,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })
}

export function useUpdateDestination() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateDestinationInput> }) =>
      updateDestination(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })
}

export function useDeleteDestination() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDestination,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })
}

export function useTestEcho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: testEcho,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })
}

export function useImportFromDcm4chee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: importFromDcm4chee,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })
}
