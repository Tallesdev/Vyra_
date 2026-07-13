import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function interpolarTemplate(corpo, dados) {
  return corpo.replace(/\{\{(\w+)\}\}/g, (_, chave) => dados[chave] ?? `{{${chave}}}`)
}

export async function listarTemplates(tipo) {
  return prisma.template.findMany({
    where: { ativo: true, ...(tipo ? { tipo } : {}) },
    orderBy: { criadoEm: 'desc' }
  })
}

export async function buscarTemplate(id) {
  return prisma.template.findUnique({ where: { id } })
}

export async function criarTemplate(dados) {
  return prisma.template.create({ data: dados })
}

export async function editarTemplate(id, dados) {
  return prisma.template.update({ where: { id }, data: dados })
}

export async function desativarTemplate(id) {
  return prisma.template.update({ where: { id }, data: { ativo: false } })
}