import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { validacaoCamada1 } from '../modules/leads/leads.validation.js'
import { similaridadeCosseno } from '../modules/leads/leads.cosseno.js'
import { limparBanco, prisma } from './setup.js'

beforeAll(async () => {
  await limparBanco()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Validação Camada 1', () => {
  it('deve aprovar lead válido', async () => {
    const erros = await validacaoCamada1({
      nome: 'João Silva',
      telefone: '11999999999',
      mensagem: 'Tenho interesse no produto',
    })
    expect(erros).toHaveLength(0)
  })

  it('deve rejeitar nome com só números', async () => {
    const erros = await validacaoCamada1({
      nome: '123456',
      telefone: '11999999999',
      mensagem: 'Interesse no produto',
    })
    expect(erros.length).toBeGreaterThan(0)
  })

  it('deve rejeitar e-mail inválido', async () => {
    const erros = await validacaoCamada1({
      nome: 'João Silva',
      telefone: '11999999999',
      mensagem: 'Interesse no produto',
      email: 'email-invalido',
    })
    expect(erros.length).toBeGreaterThan(0)
  })

  it('deve rejeitar mensagem muito curta', async () => {
    const erros = await validacaoCamada1({
      nome: 'João Silva',
      telefone: '11999999999',
      mensagem: 'oi',
    })
    expect(erros.length).toBeGreaterThan(0)
  })
})

describe('Similaridade de Cosseno', () => {
  it('deve retornar 1 para vetores idênticos', () => {
    const vetor = [1, 0, 0, 1]
    expect(similaridadeCosseno(vetor, vetor)).toBeCloseTo(1)
  })

  it('deve retornar 0 para vetores perpendiculares', () => {
    expect(similaridadeCosseno([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('deve retornar 0 para vetores vazios', () => {
    expect(similaridadeCosseno([], [])).toBe(0)
  })

  it('deve retornar 0 para vetores de tamanhos diferentes', () => {
    expect(similaridadeCosseno([1, 2], [1, 2, 3])).toBe(0)
  })
})