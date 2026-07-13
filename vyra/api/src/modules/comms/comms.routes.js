import {
  ctrlEnviarEmail, ctrlHistoricoEmail,
  ctrlGerarLinkWhatsapp, ctrlRegistrarWhatsapp,
  ctrlListarTemplates, ctrlBuscarTemplate,
  ctrlCriarTemplate, ctrlEditarTemplate, ctrlDesativarTemplate
} from './comms.controller.js'

import {
  enviarEmailSchema, registrarWhatsappSchema,
  criarTemplateSchema, editarTemplateSchema
} from './comms.schema.js'

export async function commsRoutes(app) {
  const todos        = { preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE', 'CONSULTOR')] }
  const adminGerente = { preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }
  const apenasAdmin  = { preHandler: [app.authenticate, app.authorize('ADMIN')] }

  // EMAIL
  app.post('/email/enviar', { ...todos, schema: enviarEmailSchema }, ctrlEnviarEmail)
  app.get('/email/historico/:leadId', { ...todos }, ctrlHistoricoEmail)

  // WHATSAPP
  app.post('/whatsapp/link', { ...todos }, ctrlGerarLinkWhatsapp)
  app.post('/whatsapp/registrar', { ...todos, schema: registrarWhatsappSchema }, ctrlRegistrarWhatsapp)

  // TEMPLATES
  app.get('/templates', { ...todos }, ctrlListarTemplates)
  app.get('/templates/:id', { ...todos }, ctrlBuscarTemplate)
  app.post('/templates', { ...adminGerente, schema: criarTemplateSchema }, ctrlCriarTemplate)
  app.put('/templates/:id', { ...adminGerente, schema: editarTemplateSchema }, ctrlEditarTemplate)
  app.delete('/templates/:id', { ...apenasAdmin }, ctrlDesativarTemplate)
}