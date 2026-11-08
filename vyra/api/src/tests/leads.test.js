import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { validacaoCamada1, contemTermo } from '../modules/leads/leads.validation.js'
import { similaridadeCosseno } from '../modules/leads/leads.cosseno.js'
import { limparBanco, prisma } from './setup.js'
import { interpretarClassificacao } from '../modules/leads/leads.ia.js'


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

describe('Interpretação da resposta da IA (Camada 2)', () => {
  it('aprova só quando a classificação é exatamente VALIDO', () => {
    expect(interpretarClassificacao('{"classificacao":"VALIDO","motivo":"ok"}')).toBe(true)
  })

  it('reprova INVALIDO — o bug original aprovava esse caso', () => {
    expect(interpretarClassificacao('{"classificacao":"INVALIDO","motivo":"spam"}')).toBe(false)
  })

  it('reprova resposta fora do formato esperado (fail-closed)', () => {
    expect(interpretarClassificacao('VALIDO')).toBe(false)
    expect(interpretarClassificacao('')).toBe(false)
    expect(interpretarClassificacao('{}')).toBe(false)
  })
})


describe('Termos bloqueados (palavra inteira)', () => {
  it('não bloqueia palavras comuns que contêm um termo no meio', () => {
    expect(contemTermo('Quero saber o custo e os documentos', 'cu')).toBe(false)
    expect(contemTermo('Paula, temos filial em São Paulo', 'pau')).toBe(false)
    expect(contemTermo('O computador da loja trava', 'puta')).toBe(false)
    expect(contemTermo('Cada transação de venda', 'transa')).toBe(false)
  })

  it('bloqueia o termo como palavra inteira, ignorando maiúsculas e acentos', () => {
    expect(contemTermo('Seu OTÁRIO', 'otario')).toBe(true)
    expect(contemTermo('que porra é essa', 'porra')).toBe(true)
  })

  it('bloqueia variações com @ e termos de mais de uma palavra', () => {
    expect(contemTermo('c@r@lho de sistema', 'c@r@lho')).toBe(true)
    expect(contemTermo('Lorem ipsum dolor', 'lorem ipsum')).toBe(true)
  })
})
