import {
  dashboardHandler,
  serieHandler,
  rankingHandler,
  origensHandler,
} from './logs.controller.js'

import {
  dashboardSchema,
  serieSchema,
  rankingSchema,
  origensSchema,
} from './logs.schema.js'

export async function logsRoutes(app) {
  // Todo usuário autenticado vê métricas — o escopo dos dados é que muda
  // conforme o papel (ver shared/escopo-leads.js).
  const auth = { preHandler: [app.authenticate] }

  app.get('/dashboard', { schema: dashboardSchema, ...auth }, dashboardHandler)
  app.get('/serie', { schema: serieSchema, ...auth }, serieHandler)
  app.get('/ranking', { schema: rankingSchema, ...auth }, rankingHandler)
  app.get('/origens', { schema: origensSchema, ...auth }, origensHandler)
}
