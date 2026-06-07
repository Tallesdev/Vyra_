import {
  webhookHandler,
  listarLeadsHandler,
  buscarLeadHandler,
} from './leads.controller.js'

import {
  webhookSchema,
  listarLeadsSchema,
  buscarLeadSchema,
} from './leads.schema.js'

export async function leadsRoutes(app) {
  // Público — sem autenticação
  app.post('/webhook', { schema: webhookSchema }, webhookHandler)

  // Protegidos
  app.get(
    '/',
    { schema: listarLeadsSchema, preHandler: [app.authenticate] },
    listarLeadsHandler
  )

  app.get(
    '/:id',
    { schema: buscarLeadSchema, preHandler: [app.authenticate] },
    buscarLeadHandler
  )
}