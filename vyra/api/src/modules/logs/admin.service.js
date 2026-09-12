import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Aquisições (canais de origem) ────────────────────────────────────────────

export async function listarAquisicoes() {
  return prisma.aquisicao.findMany({ orderBy: { nome: 'asc' } })
}

export async function criarAquisicao({ nome }) {
  const existente = await prisma.aquisicao.findFirst({ where: { nome } })

  if (existente) {
    throw { statusCode: 409, message: 'Já existe uma aquisição com este nome' }
  }

  return prisma.aquisicao.create({ data: { nome } })
}

export async function desativarAquisicao(id) {
  const aquisicao = await prisma.aquisicao.findUnique({ where: { id } })

  if (!aquisicao) {
    throw { statusCode: 404, message: 'Aquisição não encontrada' }
  }

  return prisma.aquisicao.update({ where: { id }, data: { ativo: false } })
}

// ─── Termos bloqueados (usados na Camada 1 de validação) ──────────────────────

export async function listarTermos() {
  return prisma.termoBloqueado.findMany({ orderBy: { termo: 'asc' } })
}

export async function criarTermo({ termo }) {
  const normalizado = termo.trim().toLowerCase()

  const existente = await prisma.termoBloqueado.findUnique({
    where: { termo: normalizado },
  })

  if (existente) {
    throw { statusCode: 409, message: 'Este termo já está bloqueado' }
  }

  return prisma.termoBloqueado.create({ data: { termo: normalizado } })
}

export async function removerTermo(id) {
  const termo = await prisma.termoBloqueado.findUnique({ where: { id } })

  if (!termo) {
    throw { statusCode: 404, message: 'Termo não encontrado' }
  }

  await prisma.termoBloqueado.delete({ where: { id } })
  return { message: 'Termo removido' }
}

// ─── Perfis de oportunidade ───────────────────────────────────────────────────

export async function listarPerfis() {
  return prisma.perfilOportunidade.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
  })
}

export async function criarPerfil({ nome, descricao }) {
  return prisma.perfilOportunidade.create({ data: { nome, descricao } })
}

export async function desativarPerfil(id) {
  const perfil = await prisma.perfilOportunidade.findUnique({ where: { id } })

  if (!perfil) {
    throw { statusCode: 404, message: 'Perfil não encontrado' }
  }

  return prisma.perfilOportunidade.update({
    where: { id },
    data: { ativo: false },
  })
}
