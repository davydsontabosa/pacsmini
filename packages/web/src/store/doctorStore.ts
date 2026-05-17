import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ActiveDoctor {
  id:             number
  name:           string
  crm:            string
  specialization: string
  modalities:     string[]
}

interface DoctorStore {
  activeDoctor: ActiveDoctor | null
  setActiveDoctor: (doctor: ActiveDoctor) => void
  clearDoctor: () => void
}

export const useDoctorStore = create<DoctorStore>()(
  persist(
    (set) => ({
      activeDoctor: null,
      setActiveDoctor: (doctor) => set({ activeDoctor: doctor }),
      clearDoctor:     () => set({ activeDoctor: null }),
    }),
    { name: 'pacs-doctor-session', version: 1, migrate: (s) => s as DoctorStore },
  ),
)
