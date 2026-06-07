import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  recuperarSenhaHandler,
  perfilHandler,
} from './auth.controller.js'

import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  recuperarSenhaSchema,
  perfilSchema,
} from './auth.schema.js'

export async function authRoutes(app) {
  app.post('/login', { schema: loginSchema }, loginHandler)
  app.post('/refresh', { schema: refreshSchema }, refreshHandler)
  app.post('/recuperar-senha', { schema: recuperarSenhaSchema }, recuperarSenhaHandler)

  app.post(
    '/logout',
    { schema: logoutSchema, preHandler: [app.authenticate] },
    logoutHandler
  )

  app.get(
    '/perfil',
    { schema: perfilSchema, preHandler: [app.authenticate] },
    perfilHandler
  )
}