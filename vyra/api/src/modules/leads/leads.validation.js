import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function semAcentos(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function contemTermo(texto, termo) {
  const alvo = semAcentos(texto.toLowerCase())
  const palavra = escaparRegex(semAcentos(termo.toLowerCase()))
  return new RegExp(`(^|[^\\p{L}\\p{N}@])${palavra}($|[^\\p{L}\\p{N}@])`, 'u').test(alvo)
}


export async function validacaoCamada1(dados) {
  const erros = []

  // Campos obrigatórios
  if (!dados.nome || dados.nome.trim().length < 2) {
    erros.push('Nome inválido ou ausente')
  }

  if (!dados.telefone || dados.telefone.trim().length < 8) {
    erros.push('Telefone inválido ou ausente')
  }

  if (!dados.mensagem || dados.mensagem.trim().length < 5) {
    erros.push('Mensagem inválida ou ausente')
  }

  // Nome não pode ser só números
  if (dados.nome && /^\d+$/.test(dados.nome.trim())) {
    erros.push('Nome não pode ser apenas números')
  }

  // E-mail opcional, mas se informado deve ser válido
  if (dados.email && !EMAIL_REGEX.test(dados.email)) {
    erros.push('Formato de e-mail inválido')
  }

  // Verifica termos bloqueados no banco
    const termos = await prisma.termoBloqueado.findMany()
  const texto = `${dados.nome} ${dados.mensagem}`

  for (const { termo } of termos) {
    if (contemTermo(texto, termo)) {
      erros.push(`Conteúdo bloqueado detectado`)
      break
    }
  }


  return erros
}