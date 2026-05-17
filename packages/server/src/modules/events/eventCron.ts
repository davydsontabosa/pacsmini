import cron from 'node-cron'
import axios from 'axios'
import { env } from '../../config/env'
import { recordEvent, getPendingErrors, markNotified } from './eventService'
import { sendDicomErrorAlert } from '../notifications/emailService'
import { saveAlert } from '../notifications/alertStore'

async function fetchFailedTasks(endpoint: string, eventType: string) {
  try {
    const res = await axios.get(
      `${env.DCM4CHEE_BASE_URL}/dcm4chee-arc/monitor/${endpoint}`,
      { params: { status: 'FAILED', limit: 20 }, headers: { Accept: 'application/json' }, timeout: 8000 }
    )
    const tasks: Array<Record<string, unknown>> = res.data ?? []
    tasks.forEach((task) => {
      recordEvent({
        event_type:  eventType,
        source_aet:  String(task.deviceName ?? task.LocalAET ?? ''),
        patient_id:  String(task.patientID ?? ''),
        study_uid:   String(task.StudyInstanceUID ?? ''),
        detail:      String(task.errorMessage ?? task.outcomeDescription ?? JSON.stringify(task).slice(0, 200)),
        occurred_at: String(task.createdTime ?? new Date().toISOString()),
      })
    })
  } catch {
    // Silencioso — servidor pode estar offline
  }
}

export function startEventCron() {
  cron.schedule('*/5 * * * *', async () => {
    await fetchFailedTasks('export', 'export_error')
    await fetchFailedTasks('retrieve', 'retrieve_error')

    const pending = getPendingErrors(10)
    if (pending.length === 0) return

    try {
      const recipients = env.EMAIL_ALERT_TO.split(',').map(e => e.trim())
      await sendDicomErrorAlert(
        pending.map(e => ({
          eventType:  e.event_type,
          sourceAet:  e.source_aet ?? undefined,
          patientId:  e.patient_id ?? undefined,
          studyUid:   e.study_uid ?? undefined,
          detail:     e.detail ?? '',
          occurredAt: e.occurred_at,
        })),
        recipients
      )
      markNotified(pending.map(e => e.id))
      saveAlert({
        type:     'dicom_error',
        message:  `${pending.length} erro(s) DICOM notificados`,
        email_to: recipients.join(', '),
      })
    } catch (err) {
      console.error('[EventCron] Falha ao enviar email:', err)
    }
  })
  console.log('[EventCron] Agendado: a cada 5 minutos')
}
