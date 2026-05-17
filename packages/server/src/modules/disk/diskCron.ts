import cron from 'node-cron'
import { getDiskStatus } from './diskService'
import { sendDiskAlert } from '../notifications/emailService'
import { getLastAlertByType, saveAlert } from '../notifications/alertStore'
import { env } from '../../config/env'

export function startDiskCron() {
  const COOLDOWN_HOURS = parseInt(env.DISK_COOLDOWN_HOURS, 10)
  cron.schedule(env.DISK_CHECK_CRON, async () => {
    try {
      const disk = await getDiskStatus()
      console.log(`[Disk] ${disk.usedPercent}% usado (${disk.usedHuman} / ${disk.totalHuman})`)
      if (disk.status === 'ok') return

      const alertType = disk.status === 'critical' ? 'disk_critical' : 'disk_warning'
      const lastAlert = getLastAlertByType(alertType)
      if (lastAlert) {
        const hoursAgo = (Date.now() - new Date(lastAlert.sent_at).getTime()) / (1000 * 60 * 60)
        if (hoursAgo < COOLDOWN_HOURS) return
      }

      const recipients = env.EMAIL_ALERT_TO.split(',').map(e => e.trim())
      await sendDiskAlert(disk, recipients)
      saveAlert({
        type:     alertType,
        message:  `Disco ${disk.status === 'critical' ? 'CRÍTICO' : 'em alerta'}: ${disk.usedPercent}% (${disk.freeHuman} livre)`,
        email_to: recipients.join(', '),
      })
    } catch (err) {
      console.error('[DiskCron] Erro:', err)
    }
  })
  console.log(`[DiskCron] Agendado: ${env.DISK_CHECK_CRON}`)
}
