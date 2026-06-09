import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function criarPipeline({ nome, ordem = 0 }) {
  const pipeline = await prisma.pipeline.create({
    data: { nome, ordem },
  })

  // Cria automaticamente as etapas obrigatórias
  await prisma.etapa.createMany({
    data: [
      { nome: 'Ganhou', ordem: 9998, cor: '#22C55E', obrigatoria: true, pipelineId: pipeline.id },
      { nome: 'Perdeu', ordem: 9999, cor: '#EF4444', obrigatoria: true, pipelineId: pipeline.id },
    ],
  })

  return prisma.pipeline.findUnique({
    where: { id: pipeline.id },
    include: { etapas: { orderBy: { ordem: 'asc' } } },
  })
}

export async function listarPipelines() {
  return prisma.pipeline.findMany({
    where: { ativo: true },
    include: { etapas: { orderBy: { ordem: 'asc' } } },
    orderBy: { ordem: 'asc' },
  })
}

export async function atualizarPipeline(id, dados) {
  return prisma.pipeline.update({
    where: { id },
    data: dados,
  })
}

export async function deletarPipeline(id) {
  // Soft delete
  return prisma.pipeline.update({
    where: { id },
    data: { ativo: false },
  })
}

export async function criarEtapa(pipelineId, { nome, ordem, cor = '#6B7280' }) {
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } })

  if (!pipeline) {
    throw { statusCode: 404, message: 'Pipeline não encontrada' }
  }

  return prisma.etapa.create({
    data: { nome, ordem, cor, pipelineId },
  })
}

export async function atualizarEtapa(id, dados) {
  const etapa = await prisma.etapa.findUnique({ where: { id } })

  if (!etapa) {
    throw { statusCode: 404, message: 'Etapa não encontrada' }
  }

  if (etapa.obrigatoria && (dados.nome || dados.ordem !== undefined)) {
    throw { statusCode: 400, message: 'Não é possível alterar nome ou ordem de etapas obrigatórias' }
  }

  return prisma.etapa.update({ where: { id }, data: dados })
}

export async function deletarEtapa(id) {
  const etapa = await prisma.etapa.findUnique({ where: { id } })

  if (!etapa) {
    throw { statusCode: 404, message: 'Etapa não encontrada' }
  }

  if (etapa.obrigatoria) {
    throw { statusCode: 400, message: 'Não é possível deletar etapas obrigatórias (Ganhou/Perdeu)' }
  }

  return prisma.etapa.delete({ where: { id } })
}