import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { authRoutes } from '../modules/auth/auth.routes.js'
import { authenticate } from '../shared/middlewares/authenticate.js'
import { limparBanco, criarAdminTeste, prisma } from './setup.js'
import cookie from '@fastify/cookie'


let app
let adminCriado

beforeAll(async () => {
  await limparBanco()
  adminCriado = await criarAdminTeste()

  app = Fastify()
  await app.register(jwt, { secret: 'test_secret' })
  await app.register(cookie)
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
    expect(body).not.toHaveProperty('refreshToken')
    const cookieRefresh = response.cookies.find((c) => c.name === 'vyra_refresh')
    expect(cookieRefresh).toBeDefined()
    expect(cookieRefresh.httpOnly).toBe(true)

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

describe('Sessão via cookie (refresh e logout)', () => {
  async function logar() {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin.teste@vyra.com', senha: 'admin123' },
    })
    const cookieRefresh = login.cookies.find((c) => c.name === 'vyra_refresh')
    return { accessToken: JSON.parse(login.body).accessToken, refreshToken: cookieRefresh.value }
  }

  it('renova o access token usando só o cookie', async () => {
    const { refreshToken } = await logar()
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { vyra_refresh: refreshToken },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('accessToken')
    expect(body.usuario.email).toBe('admin.teste@vyra.com')
  })

  it('retorna 401, e não 500, quando não há cookie', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/refresh' })
    expect(response.statusCode).toBe(401)
  })

  it('logout sem cookie não apaga a sessão de ninguém', async () => {
    const { accessToken } = await logar()
    const antes = await prisma.refreshToken.count()

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    expect(response.statusCode).toBe(200)
    expect(await prisma.refreshToken.count()).toBe(antes)
  })

  it('depois do logout, o cookie antigo não renova mais', async () => {
    const { accessToken, refreshToken } = await logar()
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${accessToken}` },
      cookies: { vyra_refresh: refreshToken },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { vyra_refresh: refreshToken },
    })
    expect(response.statusCode).toBe(401)
  })
})
