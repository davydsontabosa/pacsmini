import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import { env } from '../../config/env'
import type { DiskStatus } from '../disk/diskService'

let _transport: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === 'true',
      auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }
  return _transport
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
  await getTransport().sendMail({ from: env.EMAIL_FROM, to: recipients.join(', '), subject, html })
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
  await getTransport().sendMail({ from: env.EMAIL_FROM, to: recipients.join(', '), subject, html })
}

export interface ShareEmailData {
  recipientEmail: string
  shareUrl:       string
  qrDataUrl?:     string
  studyDesc:      string
  patientName:    string
  modalities:     string[]
  expiresAt:      Date
  createdBy:      string
  hasPassword:    boolean
  password?:      string
}

export async function sendShareEmail(data: ShareEmailData) {
  const subject = `📋 [PACS Mini] Exame disponível: ${data.patientName} — ${data.studyDesc || 'Exame DICOM'}`

  // QR code como imagem inline via CID attachment
  const attachments: Attachment[] = []
  let qrImgTag = ''
  if (data.qrDataUrl) {
    const base64Data = data.qrDataUrl.replace(/^data:image\/png;base64,/, '')
    attachments.push({ filename: 'qrcode.png', content: base64Data, encoding: 'base64', cid: 'qrcode@pacsmini' })
    qrImgTag = `
      <div style="text-align:center;margin:24px 0;">
        <p style="color:#64748b;font-size:12px;margin-bottom:8px;">Ou escaneie o QR Code com o celular:</p>
        <img src="cid:qrcode@pacsmini" width="180" height="180"
             style="border-radius:12px;border:4px solid #1e3050;" alt="QR Code" />
      </div>`
  }

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#070B14;color:#e2e8f0;padding:32px;border-radius:12px;">

      <!-- Header -->
      <div style="margin-bottom:24px;">
        <p style="font-size:12px;color:#38BDF8;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">PACS Mini</p>
        <h1 style="color:#fff;font-size:22px;margin:0 0 6px;font-weight:700;">Exame Disponível para Consulta</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">
          Compartilhado por <strong style="color:#94a3b8">${data.createdBy}</strong>
        </p>
      </div>

      <!-- Dados do exame -->
      <div style="background:#0D1526;border:1px solid #1e3050;border-radius:10px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #1e3050;">
            <td style="padding:10px 8px;color:#64748b;font-size:13px;width:110px;">Paciente</td>
            <td style="padding:10px 8px;color:#f1f5f9;font-size:14px;font-weight:700;">${data.patientName}</td>
          </tr>
          <tr style="border-bottom:1px solid #1e3050;">
            <td style="padding:10px 8px;color:#64748b;font-size:13px;">Exame</td>
            <td style="padding:10px 8px;color:#e2e8f0;font-size:13px;">${data.studyDesc || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #1e3050;">
            <td style="padding:10px 8px;color:#64748b;font-size:13px;">Modalidade</td>
            <td style="padding:10px 8px;color:#38BDF8;font-size:13px;font-family:monospace;font-weight:700;">${data.modalities.join(' · ') || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px;color:#64748b;font-size:13px;">Válido até</td>
            <td style="padding:10px 8px;color:#fbbf24;font-size:13px;font-weight:600;">${data.expiresAt.toLocaleString('pt-BR')}</td>
          </tr>
        </table>
      </div>

      <!-- Botão de acesso -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${data.shareUrl}"
           style="display:inline-block;background:#38BDF8;color:#070B14;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
          Acessar Exame no Navegador
        </a>
      </div>
      <p style="text-align:center;color:#334155;font-size:11px;word-break:break-all;margin-bottom:0;">${data.shareUrl}</p>

      ${qrImgTag}

      ${data.hasPassword && data.password ? `
      <!-- Senha -->
      <div style="border:1px solid #fbbf24;border-radius:10px;padding:16px;margin-bottom:20px;background:#1a1000;">
        <p style="margin:0 0 6px;color:#fbbf24;font-size:13px;font-weight:700;">🔒 Link protegido por senha</p>
        <p style="margin:0;color:#e2e8f0;font-family:monospace;font-size:20px;letter-spacing:4px;font-weight:700;">
          ${data.password}
        </p>
      </div>` : ''}

      <!-- Rodapé -->
      <div style="border-top:1px solid #1e3050;padding-top:16px;margin-top:8px;">
        <p style="color:#334155;font-size:11px;margin:0;">
          Este link expira automaticamente em ${data.expiresAt.toLocaleString('pt-BR')}.
          Não compartilhe este e-mail com terceiros.
        </p>
        <p style="color:#1e3050;font-size:11px;margin:6px 0 0;">PACS Mini · Sistema de Gestão de Imagens Médicas</p>
      </div>
    </div>
  `

  await getTransport().sendMail({
    from:        env.EMAIL_FROM,
    to:          data.recipientEmail,
    subject,
    html,
    attachments,
  })
  console.log(`[Email] Share enviado para: ${data.recipientEmail}`)
}
