import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cookie from '@fastify/cookie'
import { tratarErro } from './shared/tratar-erro.js'
import rateLimit from '@fastify/rate-limit'




import { authenticate } from './shared/middlewares/authenticate.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { leadsRoutes } from './modules/leads/leads.routes.js'
import { leadsWorker } from './modules/leads/leads.worker.js'
import { pipelinesRoutes } from './modules/pipelines/pipelines.routes.js'
import { crmRoutes } from './modules/crm/crm.routes.js'
import { commsRoutes } from './modules/comms/comms.routes.js'
import { logsRoutes } from './modules/logs/logs.routes.js'
import { usersRoutes } from './modules/auth/users.routes.js'
import { adminRoutes } from './modules/logs/admin.routes.js'
import { auditarRequisicao } from './shared/auditoria.js'


// Em produção a API fica atrás do Caddy: o IP real do visitante vem no cabeçalho
// X-Forwarded-For. Sem isso, todo mundo teria o IP do Caddy e os limites de
// tentativas (login e recuperação de senha) valeriam para todos os usuários juntos.
// Só em produção: lá a API não tem porta aberta, então ninguém fala com ela sem passar pelo Caddy.
const app = Fastify({ logger: true, trustProxy: process.env.NODE_ENV === 'production' })


const ORIGENS_PERMITIDAS = (process.env.CORS_ORIGIN || 'http://localhost:3100,http://localhost:3001')
  .split(',')
  .map((origem) => origem.trim())

await app.register(cors, { origin: ORIGENS_PERMITIDAS, credentials: true })
await app.register(cookie)
await app.register(rateLimit, { global: false })



await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev_secret',
})

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Vyra CRM API',
      description: 'CRM inteligente com atribuição de leads por IA semântica',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
})

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
})

// Decorators ANTES das rotas
app.decorate('authenticate', authenticate)
app.decorate('authorize', function(...roles) {
  return async function(request, reply) {
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ message: 'Acesso negado: permissão insuficiente' })
    }
  }
})

app.setErrorHandler(tratarErro)

// Auditoria: grava no MongoDB toda requisição que altera algo.
// Precisa vir ANTES das rotas: as rotas só herdam os hooks que já existem quando são registradas.
app.addHook('onResponse', auditarRequisicao)


// Rotas DEPOIS dos decorators
app.get('/health', {
  schema: {
    tags: ['Sistema'],
    summary: 'Health check da API',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
    },
  },
}, async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(leadsRoutes, { prefix: '/api/leads' })
await app.register(pipelinesRoutes, { prefix: '/api/pipelines' })
await app.register(crmRoutes, { prefix: '/api/crm' })
await app.register(commsRoutes, { prefix: '/api/comms' })
await app.register(logsRoutes, { prefix: '/api/logs' })
await app.register(usersRoutes, { prefix: '/api/users' })
await app.register(adminRoutes, { prefix: '/api/admin' })

app.addHook('onClose', async () => {
  await leadsWorker.close()
})

const PORT = process.env.PORT || 3000

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 Vyra API rodando em http://localhost:${PORT}`)
  console.log(`📄 Swagger UI em http://localhost:${PORT}/docs\n`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}