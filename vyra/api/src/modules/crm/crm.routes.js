import {
  perfilLeadHandler,
  atualizarLeadHandler,
  adicionarAtividadeHandler,
  fecharOportunidadeHandler,
  reatribuirLeadHandler,
} from './crm.controller.js'

import {
  perfilLeadSchema,
  atualizarLeadSchema,
  adicionarAtividadeSchema,
  fecharOportunidadeSchema,
  reatribuirLeadSchema,
} from './crm.schema.js'

export async function crmRoutes(app) {
  const auth = { preHandler: [app.authenticate] }
  const adminGerente = { preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }

  app.get('/:id', { schema: perfilLeadSchema, ...auth }, perfilLeadHandler)
  app.put('/:id', { schema: atualizarLeadSchema, ...auth }, atualizarLeadHandler)
  app.post('/:id/atividades', { schema: adicionarAtividadeSchema, ...auth }, adicionarAtividadeHandler)
  app.patch('/:id/fechar', { schema: fecharOportunidadeSchema, ...auth }, fecharOportunidadeHandler)
  app.patch('/:id/reatribuir', { schema: reatribuirLeadSchema, ...adminGerente }, reatribuirLeadHandler)
}