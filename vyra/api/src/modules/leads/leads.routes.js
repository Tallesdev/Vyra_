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
import { verificarAssinaturaWebhook } from '../../shared/assinatura-webhook.js'


export async function leadsRoutes(app) {
  // A assinatura do webhook e calculada sobre os bytes exatos recebidos
  // entao o corpo original precisa ser guardado antes de virar objeto
   app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, corpo, done) => {
    request.rawBody = corpo
    try {
      done(null, JSON.parse(corpo))
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  // Público
  app.post('/webhook', { schema: webhookSchema, preValidation: [verificarAssinaturaWebhook] }, webhookHandler)

  // Protegidos
  app.get('/', { schema: listarLeadsSchema, preHandler: [app.authenticate] }, listarLeadsHandler)
  app.get('/ociosos', { schema: ociosidadeSchema, preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }, listarOciososHandler)
  app.get('/:id', { schema: buscarLeadSchema, preHandler: [app.authenticate] }, buscarLeadHandler)
  app.patch('/:id/mover', { schema: moverLeadSchema, preHandler: [app.authenticate] }, moverLeadHandler)
}