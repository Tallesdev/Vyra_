import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { tratarErro } from '../shared/tratar-erro.js'

let app

beforeAll(async () => {
  app = Fastify()
  app.setErrorHandler(tratarErro)

  app.get('/inesperado', async () => {
    throw new Error('Invalid `prisma.lead.update()` invocation: constraint `leads_perfilId_fkey`')
  })
  app.get('/prisma-chave-estrangeira', async () => {
    const erro = new Error('Foreign key constraint violated on the constraint: `leads_perfilId_fkey`')
    erro.code = 'P2003'
    throw erro
  })
  app.get('/negocio', async () => {
    throw { statusCode: 404, message: 'Lead não encontrado' }
  })
  app.get('/negocio-com-lista', async () => {
    throw { statusCode: 400, message: 'Lead rejeitado na validação', erros: ['Telefone inválido'] }
  })

  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('Tratamento central de erros', () => {
  it('erro inesperado devolve mensagem genérica, sem detalhes internos', async () => {
    const response = await app.inject({ method: 'GET', url: '/inesperado' })

    expect(response.statusCode).toBe(500)
    expect(response.json().message).toBe('Erro interno do servidor')
    expect(response.json()).toHaveProperty('idRequisicao')
    expect(response.body).not.toContain('prisma')
    expect(response.body).not.toContain('leads_perfilId_fkey')
  })

  it('chave estrangeira inválida vira 400, também sem vazar o nome da constraint', async () => {
    const response = await app.inject({ method: 'GET', url: '/prisma-chave-estrangeira' })

    expect(response.statusCode).toBe(400)
    expect(response.body).not.toContain('leads_perfilId_fkey')
  })

  it('erro de negócio mantém o status e a mensagem escrita para o usuário', async () => {
    const response = await app.inject({ method: 'GET', url: '/negocio' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Lead não encontrado')
  })

  it('a lista de erros da validação continua chegando ao cliente', async () => {
    const response = await app.inject({ method: 'GET', url: '/negocio-com-lista' })

    expect(response.statusCode).toBe(400)
    expect(response.json().erros).toEqual(['Telefone inválido'])
  })
})
