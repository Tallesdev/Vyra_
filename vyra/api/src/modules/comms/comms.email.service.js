import nodemailer from 'nodemailer'
import { registrarEvento, buscarTimeline } from '../crm/crm.timeline.js'
import { interpolarTemplate, buscarTemplate } from './comms.template.service.js'

function criarTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

export async function enviarEmail({ leadId, consultorId, para, assunto, corpo, templateId }) {
  let assuntoFinal = assunto
  let corpoFinal   = corpo

  if (templateId) {
    const template = await buscarTemplate(templateId)
    if (template) {
      assuntoFinal = template.assunto ?? assunto
      corpoFinal   = interpolarTemplate(template.corpo, { assunto, corpo })
    }
  }

  let status = 'enviado'
  let erro   = null

  try {
    const transporter = criarTransporter()
    await transporter.sendMail({
      from:    process.env.SMTP_FROM,
      to:      para,
      subject: assuntoFinal,
      html:    corpoFinal
    })
  } catch (err) {
    status = 'erro'
    erro   = err.message
  }

  await registrarEvento({
  leadId,
  tipo: 'EMAIL',
  descricao: `E-mail enviado para ${para}: ${assuntoFinal}`,
  metadata: { de: process.env.SMTP_FROM, para, assunto: assuntoFinal, corpo: corpoFinal, templateId, status, erro },
  usuario: { id: consultorId }
})

  if (status === 'erro') throw new Error(erro)
}


export async function historicoEmail(leadId) {
  const timeline = await buscarTimeline(leadId)
  return timeline.filter(e => e.tipo === 'EMAIL')
}