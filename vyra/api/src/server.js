import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { authenticate } from './shared/middlewares/authenticate.js'
import { authorize } from './shared/middlewares/authorize.js'
import { authRoutes } from './modules/auth/auth.routes.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

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

app.decorate('authenticate', authenticate)
app.decorate('authorize', authorize)

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

const PORT = process.env.PORT || 3000

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 Vyra API rodando em http://localhost:${PORT}`)
  console.log(`📄 Swagger UI em http://localhost:${PORT}/docs\n`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}