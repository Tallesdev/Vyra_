import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { authRoutes, LIMITE_TENTATIVAS_LOGIN } from '../modules/auth/auth.routes.js'
import { authenticate } from '../shared/middlewares/authenticate.js'
import { tratarErro } from '../shared/tratar-erro.js'

let app

beforeAll(async () => {
  app = Fastify()
  app.setErrorHandler(tratarErro)
  await app.register(jwt, { secret: 'test_secret' })
  await app.register(cookie)
  await app.register(rateLimit, { global: false })
  app.decorate('authenticate', authenticate)
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

const tentarLogin = (email) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, senha: 'senha-errada' } })

describe('Limite de tentativas de login', () => {
  it('bloqueia a tentativa que passa do limite com 429', async () => {
    for (let i = 0; i < LIMITE_TENTATIVAS_LOGIN; i++) {
      expect((await tentarLogin('alvo1@vyra.com')).statusCode).toBe(401)
    }

    const bloqueada = await tentarLogin('alvo1@vyra.com')
    expect(bloqueada.statusCode).toBe(429)
    expect(bloqueada.json().message).toContain('Muitas tentativas de login')
    expect(bloqueada.headers['retry-after']).toBeDefined()
  })

  it('variar maiúsculas e espaços no e-mail não fura o limite', async () => {
    const variacoes = ['alvo2@vyra.com', 'ALVO2@vyra.com', 'Alvo2@Vyra.com', 'alvo2@VYRA.COM', ' alvo2@vyra.com ']
    for (let i = 0; i < LIMITE_TENTATIVAS_LOGIN; i++) {
      await tentarLogin(variacoes[i % variacoes.length])
    }

    expect((await tentarLogin('aLvO2@vyra.com')).statusCode).toBe(429)
  })

  it('o bloqueio de uma conta não afeta as outras', async () => {
    for (let i = 0; i <= LIMITE_TENTATIVAS_LOGIN; i++) await tentarLogin('alvo3@vyra.com')

    expect((await tentarLogin('outra-conta@vyra.com')).statusCode).toBe(401)
  })
})

