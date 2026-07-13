import { enviarEmail, historicoEmail }       from './comms.email.service.js'
import { gerarLinkWhatsapp, registrarWhatsapp } from './comms.whatsapp.service.js'
import {
  listarTemplates,
  buscarTemplate,
  criarTemplate,
  editarTemplate,
  desativarTemplate
} from './comms.template.service.js'

// EMAIL
export async function ctrlEnviarEmail(req, reply) {
  const { leadId, para, assunto, corpo, templateId } = req.body
  await enviarEmail({ leadId, consultorId: req.user.id, para, assunto, corpo, templateId })
  return reply.code(200).send({ ok: true })
}

export async function ctrlHistoricoEmail(req, reply) {
  const emails = await historicoEmail(req.params.leadId)
  return reply.send(emails)
}

// WHATSAPP
export async function ctrlGerarLinkWhatsapp(req, reply) {
  const { telefone, mensagem } = req.body
  const link = gerarLinkWhatsapp(telefone, mensagem)
  return reply.send({ link })
}

export async function ctrlRegistrarWhatsapp(req, reply) {
  const { leadId, telefone, mensagemEnviada, templateId } = req.body
  await registrarWhatsapp({ leadId, consultorId: req.user.id, telefone, mensagemEnviada, templateId })
  return reply.code(201).send({ ok: true })
}

// TEMPLATES
export async function ctrlListarTemplates(req, reply) {
  const { tipo } = req.query
  const templates = await listarTemplates(tipo)
  return reply.send(templates)
}

export async function ctrlBuscarTemplate(req, reply) {
  const template = await buscarTemplate(req.params.id)
  if (!template) return reply.code(404).send({ erro: 'Template não encontrado' })
  return reply.send(template)
}

export async function ctrlCriarTemplate(req, reply) {
  const template = await criarTemplate(req.body)
  return reply.code(201).send(template)
}

export async function ctrlEditarTemplate(req, reply) {
  const template = await editarTemplate(req.params.id, req.body)
  return reply.send(template)
}

export async function ctrlDesativarTemplate(req, reply) {
  await desativarTemplate(req.params.id)
  return reply.code(204).send()
}