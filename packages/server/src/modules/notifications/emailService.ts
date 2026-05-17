import nodemailer from 'nodemailer'
import { env } from '../../config/env'
import type { DiskStatus } from '../disk/diskService'

function createTransport() {
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   parseInt(env.SMTP_PORT, 10),
    secure: env.SMTP_SECURE === 'true',
    auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}

export async function sendDiskAlert(disk: DiskStatus, recipients: string[]) {
  const isCritical = disk.status === 'critical'
  const subject = isCritical
    ? `🔴 [PACS Mini] CRÍTICO: Disco de storage quase cheio (${disk.usedPercent}%)`
    : `⚠️ [PACS Mini] Aviso: Espaço em disco de storage alto (${disk.usedPercent}%)`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#070B14;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;font-size:18px;margin-bottom:16px;">
        ${isCritical ? '⛔ Disco Crítico' : '⚠️ Espaço em Disco'} — PACS Mini
      </h2>
      <p style="color:#94a3b8;margin-bottom:20px;">
        O volume de storage atingiu <strong style="color:${isCritical ? '#f87171' : '#fbbf24'}">
        ${disk.usedPercent}%</strong> de uso.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #1e3050;">
          <td style="padding:10px;color:#64748b;">Caminho</td>
          <td style="padding:10px;color:#e2e8f0;">${disk.path}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e3050;">
          <td style="padding:10px;color:#64748b;">Total</td>
          <td style="padding:10px;color:#e2e8f0;">${disk.totalHuman}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e3050;">
          <td style="padding:10px;color:#64748b;">Usado</td>
          <td style="padding:10px;color:${isCritical ? '#f87171' : '#fbbf24'};">${disk.usedHuman} (${disk.usedPercent}%)</td>
        </tr>
        <tr>
          <td style="padding:10px;color:#64748b;">Livre</td>
          <td style="padding:10px;color:#22d3a5;">${disk.freeHuman} (${disk.freePercent}%)</td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">
        Gerado automaticamente pelo PACS Mini · ${new Date().toLocaleString('pt-BR')}
      </p>
    </div>
  `
  await createTransport().sendMail({ from: env.EMAIL_FROM, to: recipients.join(', '), subject, html })
  console.log(`[Email] Alerta de disco enviado para: ${recipients.join(', ')}`)
}

export interface DicomErrorInfo {
  eventType:   string
  sourceAet?:  string
  patientId?:  string
  studyUid?:   string
  detail:      string
  occurredAt:  string
}

export async function sendDicomErrorAlert(errors: DicomErrorInfo[], recipients: string[]) {
  if (errors.length === 0) return
  const subject = `🔴 [PACS Mini] ${errors.length} erro(s) DICOM detectado(s)`

  const rows = errors.map(e => `
    <tr style="border-bottom:1px solid #1e3050;">
      <td style="padding:8px;color:#64748b;font-size:12px;">${new Date(e.occurredAt).toLocaleString('pt-BR')}</td>
      <td style="padding:8px;color:#f87171;font-size:12px;">${e.eventType}</td>
      <td style="padding:8px;color:#94a3b8;font-size:12px;font-family:monospace;">${e.sourceAet ?? '—'}</td>
      <td style="padding:8px;color:#94a3b8;font-size:12px;">${e.patientId ?? '—'}</td>
      <td style="padding:8px;color:#94a3b8;font-size:12px;">${e.detail}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#070B14;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;margin-bottom:8px;">🔴 Erros DICOM Detectados</h2>
      <p style="color:#94a3b8;margin-bottom:20px;"><strong>${errors.length}</strong> erro(s) detectados no dcm4chee Archive.</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0D1526;">
            <th style="padding:8px;text-align:left;color:#38BDF8;font-size:11px;">Horário</th>
            <th style="padding:8px;text-align:left;color:#38BDF8;font-size:11px;">Tipo</th>
            <th style="padding:8px;text-align:left;color:#38BDF8;font-size:11px;">AET</th>
            <th style="padding:8px;text-align:left;color:#38BDF8;font-size:11px;">Paciente</th>
            <th style="padding:8px;text-align:left;color:#38BDF8;font-size:11px;">Detalhe</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">PACS Mini · ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `
  await createTransport().sendMail({ from: env.EMAIL_FROM, to: recipients.join(', '), subject, html })
}

export interface ShareEmailData {
  recipientEmail: string
  shareUrl:       string
  studyDesc:      string
  patientName:    string
  modalities:     string[]
  expiresAt:      Date
  createdBy:      string
  hasPassword:    boolean
  password?:      string
}

export async function sendShareEmail(data: ShareEmailData) {
  const subject = `📋 [PACS Mini] Exame compartilhado: ${data.studyDesc || 'Exame DICOM'}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#070B14;color:#e2e8f0;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;margin-bottom:4px;">📋 Exame Disponível</h2>
      <p style="color:#64748b;font-size:13px;margin-bottom:24px;">
        Compartilhado por <strong style="color:#94a3b8">${data.createdBy}</strong>
        · Expira em ${data.expiresAt.toLocaleString('pt-BR')}
      </p>
      <div style="background:#0D1526;border:1px solid #1e3050;border-radius:10px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#64748b;font-size:13px;">Paciente</td>
              <td style="padding:6px;color:#e2e8f0;font-size:13px;font-weight:600;">${data.patientName}</td></tr>
          <tr><td style="padding:6px;color:#64748b;font-size:13px;">Exame</td>
              <td style="padding:6px;color:#e2e8f0;font-size:13px;">${data.studyDesc || '—'}</td></tr>
          <tr><td style="padding:6px;color:#64748b;font-size:13px;">Modalidade</td>
              <td style="padding:6px;color:#38BDF8;font-size:13px;font-family:monospace;">${data.modalities.join(', ')}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${data.shareUrl}"
           style="display:inline-block;background:#38BDF8;color:#070B14;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
          🔗 Acessar Exame
        </a>
        <p style="color:#64748b;font-size:12px;margin-top:8px;word-break:break-all;">${data.shareUrl}</p>
      </div>
      ${data.hasPassword && data.password ? `
      <div style="border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-bottom:20px;">
        <p style="margin:0;color:#fbbf24;font-size:13px;">🔒 <strong>Link protegido por senha.</strong></p>
        <p style="margin:8px 0 0;color:#e2e8f0;font-family:monospace;font-size:16px;letter-spacing:2px;">
          Senha: <strong>${data.password}</strong>
        </p>
      </div>` : ''}
      <p style="color:#64748b;font-size:12px;border-top:1px solid #1e3050;padding-top:16px;">
        Link expira em ${data.expiresAt.toLocaleString('pt-BR')}.
      </p>
    </div>
  `
  await createTransport().sendMail({ from: env.EMAIL_FROM, to: data.recipientEmail, subject, html })
}
