import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function limparBanco() {
  // Limpa na ordem correta para respeitar foreign keys
  await prisma.refreshToken.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.etapa.deleteMany()
  await prisma.pipeline.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.termoBloqueado.deleteMany()
  await prisma.perfilOportunidade.deleteMany()
  await prisma.aquisicao.deleteMany()
}

export async function criarAdminTeste() {
  const bcrypt = await import('bcryptjs')
  const senha = await bcrypt.default.hash('admin123', 10)

  return prisma.usuario.create({
    data: {
      nome: 'Admin Teste',
      email: 'admin.teste@vyra.com',
      senha,
      role: 'ADMIN',
    },
  })
}

export async function criarConsultorTeste() {
  const bcrypt = await import('bcryptjs')
  const senha = await bcrypt.default.hash('consul123', 10)

  return prisma.usuario.create({
    data: {
      nome: 'Consultor Teste',
      email: 'consultor.teste@vyra.com',
      senha,
      role: 'CONSULTOR',
      vetorPerfil: Array(768).fill(0.1),
    },
  })
}

export { prisma }