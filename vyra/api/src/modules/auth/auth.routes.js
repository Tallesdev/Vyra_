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

export const LIMITE_TENTATIVAS_LOGIN = 10

const limiteDeLogin = {
  rateLimit: {
    max: LIMITE_TENTATIVAS_LOGIN,
    timeWindow: '15 minutes',
    hook: 'preValidation',
    keyGenerator: (request) => {
      const email = String(request.body?.email ?? '').toLowerCase().trim()
      return `login:${request.ip}:${email}`
    },
    errorResponseBuilder: (request, contexto) => ({
      statusCode: 429,
      message: `Muitas tentativas de login. Tente novamente em ${Math.ceil(contexto.ttl / 60000)} minuto(s).`,
    }),
  },
}


export async function authRoutes(app) {
  app.post('/login', { schema: loginSchema, config: limiteDeLogin }, loginHandler)
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