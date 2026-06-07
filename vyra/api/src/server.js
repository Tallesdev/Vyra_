import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const app = Fastify({
  logger: true, // JSON puro, sem pino-pretty
})

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
}, async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
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