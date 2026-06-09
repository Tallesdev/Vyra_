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

import { moverLeadHandler, listarOciososHandler } from './leads.kanban.controller.js'
import { moverLeadSchema, ociosidadeSchema } from '../pipelines/pipelines.schema.js'

export async function leadsRoutes(app) {
  // Público
  app.post('/webhook', { schema: webhookSchema }, webhookHandler)

  // Protegidos
  app.get('/', { schema: listarLeadsSchema, preHandler: [app.authenticate] }, listarLeadsHandler)
  app.get('/ociosos', { schema: ociosidadeSchema, preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }, listarOciososHandler)
  app.get('/:id', { schema: buscarLeadSchema, preHandler: [app.authenticate] }, buscarLeadHandler)
  app.patch('/:id/mover', { schema: moverLeadSchema, preHandler: [app.authenticate] }, moverLeadHandler)
}