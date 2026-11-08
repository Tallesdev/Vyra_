import { describe, it, expect } from 'vitest'
import { calcularAssinatura, assinaturaValida } from '../shared/assinatura-webhook.js'

const segredo = 'segredo-de-teste'
const agora = 1_800_000_000
const corpoBruto = JSON.stringify({ nome: 'Carlos', telefone: '11999990000', mensagem: 'Quero um orçamento' })

const valida = (sobrescrever = {}) =>
  assinaturaValida({
    segredo,
    timestamp: String(agora),
    corpoBruto,
    assinatura: calcularAssinatura(segredo, String(agora), corpoBruto),
    agora,
    ...sobrescrever,
  })

describe('Assinatura do webhook (HMAC)', () => {
  it('aceita assinatura correta', () => {
    expect(valida()).toBe(true)
  })

  it('recusa quando não há assinatura', () => {
    expect(valida({ assinatura: undefined })).toBe(false)
  })

  it('recusa assinatura feita com outro segredo', () => {
    expect(valida({ assinatura: calcularAssinatura('outro-segredo', String(agora), corpoBruto) })).toBe(false)
  })

  it('recusa corpo alterado depois de assinado', () => {
    expect(valida({ corpoBruto: corpoBruto.replace('Carlos', 'Hacker') })).toBe(false)
  })

  it('recusa requisição antiga (replay)', () => {
    expect(valida({ agora: agora + 10 * 60 })).toBe(false)
  })

  it('recusa assinatura de tamanho diferente sem lançar erro', () => {
    expect(valida({ assinatura: 'sha256=abc' })).toBe(false)
  })
})
