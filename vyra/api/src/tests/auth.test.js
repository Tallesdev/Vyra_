import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { authRoutes } from '../modules/auth/auth.routes.js'
import { authenticate } from '../shared/middlewares/authenticate.js'
import { limparBanco, criarAdminTeste, prisma } from './setup.js'

let app
let adminCriado

beforeAll(async () => {
  await limparBanco()
  adminCriado = await criarAdminTeste()

  app = Fastify()
  await app.register(jwt, { secret: 'test_secret' })
  app.decorate('authenticate', authenticate)
  app.decorate('authorize', function (...roles) {
    return async function (request, reply) {
      if (!roles.includes(request.user.role)) {
        return reply.status(403).send({ message: 'Acesso negado' })
      }
    }
  })
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.ready()
})

afterAll(async () => {
  await limparBanco()
  await app.close()
  await prisma.$disconnect()
})

describe('POST /api/auth/login', () => {
  it('deve retornar tokens com credenciais válidas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin.teste@vyra.com', senha: 'admin123' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    expect(body.usuario.role).toBe('ADMIN')
  })

  it('deve retornar 401 com senha errada', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin.teste@vyra.com', senha: 'senhaerrada' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('deve retornar 401 com e-mail inexistente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'naoexiste@vyra.com', senha: 'qualquer' },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /api/auth/perfil', () => {
  it('deve retornar 401 sem token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/perfil',
    })

    expect(response.statusCode).toBe(401)
  })

  it('deve retornar perfil com token válido', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin.teste@vyra.com', senha: 'admin123' },
    })

    const { accessToken } = JSON.parse(login.body)

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/perfil',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.email).toBe('admin.teste@vyra.com')
  })
})