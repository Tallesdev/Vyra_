import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function moverLead(leadId, { etapaId, pipelineId }, usuario) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) {
    throw { statusCode: 404, message: 'Lead não encontrado' }
  }

  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  const etapa = await prisma.etapa.findUnique({ where: { id: etapaId } })

  if (!etapa) {
    throw { statusCode: 404, message: 'Etapa não encontrada' }
  }

  // Atualiza status conforme etapa obrigatória
  let novoStatus = lead.status
  if (etapa.nome === 'Ganhou') novoStatus = 'GANHOU'
  if (etapa.nome === 'Perdeu') novoStatus = 'PERDEU'
  if (!etapa.obrigatoria && lead.status === 'NOVO') novoStatus = 'EM_ANDAMENTO'

  const leadAtualizado = await prisma.lead.update({
    where: { id: leadId },
    data: {
      etapaId,
      pipelineId: pipelineId || etapa.pipelineId,
      status: novoStatus,
      ultimaMovimentacao: new Date(),
    },
  })

  return leadAtualizado
}

export async function listarOciosos() {
  const tresDiasAtras = new Date()
  tresDiasAtras.setDate(tresDiasAtras.getDate() - 3)

  return prisma.lead.findMany({
    where: {
      ultimaMovimentacao: { lt: tresDiasAtras },
      status: { in: ['NOVO', 'EM_ANDAMENTO'] },
    },
    include: {
      consultor: { select: { id: true, nome: true } },
      etapa: { select: { id: true, nome: true } },
      pipeline: { select: { id: true, nome: true } },
    },
    orderBy: { ultimaMovimentacao: 'asc' },
  })
}