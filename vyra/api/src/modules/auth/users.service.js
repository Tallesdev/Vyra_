import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { gerarEmbedding } from '../leads/leads.ia.js'

const prisma = new PrismaClient()

export async function criarUsuario({ nome, email, senha, role, gerenteId, perfilDescricao }) {
  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) throw { statusCode: 400, message: 'E-mail já cadastrado' }

  const senhaHash = await bcrypt.hash(senha, 10)

  let vetorPerfil = []
  if (perfilDescricao) {
    vetorPerfil = await gerarEmbedding(perfilDescricao)
  }

  return prisma.usuario.create({
    data: {
      nome,
      email,
      senha: senhaHash,
      role,
      gerenteId: gerenteId || null,
      vetorPerfil,
      perfilDescricao: perfilDescricao || null,
    },
    select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true, perfilDescricao: true },
  })
}

export async function listarUsuarios(usuario) {
  const where = {}
  if (usuario.role === 'GERENTE') {
    where.gerenteId = usuario.id
  }

  return prisma.usuario.findMany({
    where,
    select: {
      id: true, nome: true, email: true,
      role: true, ativo: true, createdAt: true,
      gerente: { select: { id: true, nome: true } },
      perfilDescricao: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function atualizarUsuario(id, { nome, email, gerenteId, perfilDescricao }) {
  const dados = {}
  if (nome) dados.nome = nome
  if (email) dados.email = email
  if (gerenteId !== undefined) dados.gerenteId = gerenteId

  if (perfilDescricao) {
    dados.vetorPerfil = await gerarEmbedding(perfilDescricao)
    dados.perfilDescricao = perfilDescricao
  }

  return prisma.usuario.update({
    where: { id },
    data: dados,
    select: { id: true, nome: true, email: true, role: true, ativo: true, perfilDescricao: true },
  })
}

export async function desativarUsuario(id) {
  return prisma.usuario.update({
    where: { id },
    data: { ativo: false },
    select: { id: true, nome: true, ativo: true, perfilDescricao: true },
  })
}

export async function atualizarPerfilIA(id, { descricao }) {
  const vetorPerfil = await gerarEmbedding(descricao)

  return prisma.usuario.update({
    where: { id },
    data: { vetorPerfil, perfilDescricao: descricao },
    select: { id: true, nome: true, perfilDescricao: true },
  })
}