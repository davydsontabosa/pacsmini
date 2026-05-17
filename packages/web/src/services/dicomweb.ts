import axios from 'axios'
import { useConnectionStore, buildBaseUrl } from '../store/connectionStore'

export interface DicomStudy {
  studyInstanceUID:  string
  patientName:       string
  patientId:         string
  studyDate:         string
  studyTime:         string
  modality:          string
  modalities:        string[]
  studyDescription:  string
  numberOfSeries:    number
  numberOfInstances: number
  accessionNumber:   string
}

export interface DicomSeries {
  seriesInstanceUID: string
  seriesNumber:      string
  modality:          string
  seriesDescription: string
  numberOfInstances: number
  bodyPartExamined:  string
}

export interface DicomInstance {
  sopInstanceUID: string
  instanceNumber: string
  rows:    number
  columns: number
}

export interface DicomPatient {
  patientID:   string
  patientName: string
  birthDate:   string
  sex:         string
}

export interface MwlItem {
  scheduledProcedureStep: string
  patientName:  string
  patientID:    string
  modality:     string
  scheduledDate: string
  scheduledTime: string
  accessionNumber: string
  requestedProcedure: string
}

function dicomClient() {
  const { host, port, aet } = useConnectionStore.getState()
  return axios.create({
    baseURL: `${buildBaseUrl(host, port)}/dcm4chee-arc/aets/${aet}/rs`,
    headers: { Accept: 'application/dicom+json' },
  })
}

function getVal(obj: Record<string, { vr: string; Value?: unknown[] }>, tag: string): string {
  const entry = obj[tag]
  if (!entry?.Value?.length) return ''
  const v = entry.Value[0]
  if (typeof v === 'object' && v !== null && 'Alphabetic' in v) return (v as { Alphabetic: string }).Alphabetic || ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

function getNum(obj: Record<string, { vr: string; Value?: unknown[] }>, tag: string): number {
  const entry = obj[tag]
  if (!entry?.Value?.length) return 0
  return Number(entry.Value[0]) || 0
}

function mapStudy(obj: Record<string, { vr: string; Value?: unknown[] }>): DicomStudy {
  const modStr = getVal(obj, '00080061') || getVal(obj, '00080060')
  const modalities = modStr ? modStr.split('\\') : []
  return {
    studyInstanceUID:  getVal(obj, '0020000D'),
    patientName:       getVal(obj, '00100010'),
    patientId:         getVal(obj, '00100020'),
    studyDate:         getVal(obj, '00080020'),
    studyTime:         getVal(obj, '00080030'),
    modality:          modalities[0] ?? '',
    modalities,
    studyDescription:  getVal(obj, '00081030'),
    numberOfSeries:    getNum(obj, '00201206'),
    numberOfInstances: getNum(obj, '00201208'),
    accessionNumber:   getVal(obj, '00080050'),
  }
}

export interface StudySearchParams {
  patientName?:   string
  patientID?:     string
  studyDateFrom?: string
  studyDateTo?:   string
  modality?:      string
  accessionNumber?: string
  studyDescription?: string
  limit?:  number
  offset?: number
}

export async function getStudies(params: StudySearchParams = {}): Promise<DicomStudy[]> {
  const p: Record<string, string> = {}
  if (params.patientName)  p['PatientName'] = params.patientName
  if (params.patientID)    p['PatientID'] = params.patientID
  if (params.studyDateFrom && params.studyDateTo) {
    p['StudyDate'] = `${params.studyDateFrom}-${params.studyDateTo}`
  } else if (params.studyDateFrom) {
    p['StudyDate'] = `${params.studyDateFrom}-`
  }
  if (params.modality)         p['ModalitiesInStudy'] = params.modality
  if (params.accessionNumber)  p['AccessionNumber'] = params.accessionNumber
  if (params.studyDescription) p['StudyDescription'] = params.studyDescription
  if (params.limit)  p['limit'] = String(params.limit)
  if (params.offset) p['offset'] = String(params.offset)

  const res = await dicomClient().get<Record<string, { vr: string; Value?: unknown[] }>[]>('/studies', { params: p })
  return (res.data ?? []).map(mapStudy)
}

export async function getStudiesByPatient(patientID: string): Promise<DicomStudy[]> {
  return getStudies({ patientID })
}

export async function getSeries(studyUID: string): Promise<DicomSeries[]> {
  const res = await dicomClient().get<Record<string, { vr: string; Value?: unknown[] }>[]>(`/studies/${studyUID}/series`)
  return (res.data ?? []).map(obj => ({
    seriesInstanceUID: getVal(obj, '0020000E'),
    seriesNumber:      getVal(obj, '00200011'),
    modality:          getVal(obj, '00080060'),
    seriesDescription: getVal(obj, '0008103E'),
    numberOfInstances: getNum(obj, '00201209'),
    bodyPartExamined:  getVal(obj, '00180015'),
  }))
}

export async function getInstances(studyUID: string, seriesUID: string): Promise<DicomInstance[]> {
  const res = await dicomClient().get<Record<string, { vr: string; Value?: unknown[] }>[]>(
    `/studies/${studyUID}/series/${seriesUID}/instances`
  )
  return (res.data ?? []).map(obj => ({
    sopInstanceUID: getVal(obj, '00080018'),
    instanceNumber: getVal(obj, '00200013'),
    rows:    getNum(obj, '00280010'),
    columns: getNum(obj, '00280011'),
  }))
}

export async function getPatients(params: { patientName?: string; patientID?: string } = {}): Promise<DicomPatient[]> {
  const p: Record<string, string> = {}
  if (params.patientName) p['PatientName'] = params.patientName
  if (params.patientID)   p['PatientID'] = params.patientID
  const res = await dicomClient().get<Record<string, { vr: string; Value?: unknown[] }>[]>('/patients', { params: p })
  return (res.data ?? []).map(obj => ({
    patientID:   getVal(obj, '00100020'),
    patientName: getVal(obj, '00100010'),
    birthDate:   getVal(obj, '00100030'),
    sex:         getVal(obj, '00100040'),
  }))
}

export async function getMwlItems(params: { scheduledDate?: string; modality?: string; patientName?: string } = {}): Promise<MwlItem[]> {
  const p: Record<string, string> = {}
  if (params.scheduledDate) p['ScheduledProcedureStepSequence.ScheduledProcedureStepStartDate'] = params.scheduledDate
  if (params.modality)      p['ScheduledProcedureStepSequence.Modality'] = params.modality
  if (params.patientName)   p['PatientName'] = params.patientName
  const res = await dicomClient().get<Record<string, { vr: string; Value?: unknown[] }>[]>('/mwlitems', { params: p })
  return (res.data ?? []).map(obj => {
    const sps = (obj['00400100']?.Value?.[0] as Record<string, { vr: string; Value?: unknown[] }> | undefined) ?? {}
    return {
      scheduledProcedureStep: getVal(sps, '00400009'),
      patientName:   getVal(obj, '00100010'),
      patientID:     getVal(obj, '00100020'),
      modality:      getVal(sps, '00080060'),
      scheduledDate: getVal(sps, '00400002'),
      scheduledTime: getVal(sps, '00400003'),
      accessionNumber: getVal(obj, '00080050'),
      requestedProcedure: getVal(obj, '00321070'),
    }
  })
}

export async function healthCheck(baseUrl: string, aet: string): Promise<boolean> {
  try {
    const res = await axios.get(`${baseUrl}/dcm4chee-arc/aets`, { timeout: 5000 })
    return res.status === 200
  } catch { return false }
}

export async function uploadDicom(file: File, dicomwebBase: string): Promise<{ success: boolean; error?: string }> {
  const boundary = 'DICOM_BOUNDARY'
  const arrayBuffer = await file.arrayBuffer()
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/dicom\r\n\r\n`,
    arrayBuffer,
    `\r\n--${boundary}--\r\n`,
  ])
  try {
    await axios.post(`${dicomwebBase}/studies`, body, {
      headers: { 'Content-Type': `multipart/related; type=application/dicom; boundary=${boundary}` },
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
