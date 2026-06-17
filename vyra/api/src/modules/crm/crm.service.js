import { PrismaClient } from '@prisma/client'
import { registrarEvento, buscarTimeline } from './crm.timeline.js'

const prisma = new PrismaClient()

export async function perfilLead(leadId, usuario) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      consultor: { select: { id: true, nome: true, email: true } },
      pipeline: { select: { id: true, nome: true } },
      etapa: { select: { id: true, nome: true, cor: true } },
      perfil: true,
    },
  })

  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  const timeline = await buscarTimeline(leadId)

  return { ...lead, timeline }
}

export async function atualizarLead(leadId, dados, usuario) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  const atualizado = await prisma.lead.update({
    where: { id: leadId },
    data: dados,
  })

  await registrarEvento({
    leadId,
    tipo: 'ATIVIDADE',
    descricao: 'Dados do lead atualizados',
    metadata: dados,
    usuario,
  })

  return atualizado
}

export async function adicionarAtividade(leadId, { descricao, tipo = 'ATIVIDADE', metadata = {} }, usuario) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  const evento = await registrarEvento({
    leadId,
    tipo,
    descricao,
    metadata,
    usuario,
  })

  return evento
}

export async function fecharOportunidade(leadId, { resultado, motivoPerda, valorFinal }, usuario) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { pipeline: { include: { etapas: true } } },
  })

  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  // Busca etapa obrigatória correspondente
  const etapaFinal = lead.pipeline?.etapas.find((e) => e.nome === resultado)

  const atualizado = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: resultado,
      motivoPerda: resultado === 'PERDEU' ? motivoPerda : null,
      valorEstimado: valorFinal ? valorFinal : lead.valorEstimado,
      etapaId: etapaFinal?.id || lead.etapaId,
      ultimaMovimentacao: new Date(),
    },
  })

  await registrarEvento({
    leadId,
    tipo: 'FECHAMENTO',
    descricao: `Oportunidade ${resultado === 'GANHOU' ? 'ganha' : 'perdida'}`,
    metadata: { resultado, motivoPerda, valorFinal },
    usuario,
  })

  return atualizado
}

export async function reatribuirLead(leadId, { consultorId, motivo }, usuario) {
  if (usuario.role === 'CONSULTOR') {
    throw { statusCode: 403, message: 'Consultores não podem reatribuir leads' }
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  const consultor = await prisma.usuario.findUnique({ where: { id: consultorId } })
  if (!consultor || consultor.role !== 'CONSULTOR') {
    throw { statusCode: 400, message: 'Consultor inválido' }
  }

  const atualizado = await prisma.lead.update({
    where: { id: leadId },
    data: { consultorId },
  })

  await registrarEvento({
    leadId,
    tipo: 'ATIVIDADE',
    descricao: `Lead reatribuído para ${consultor.nome}`,
    metadata: { consultorAnterior: lead.consultorId, consultorNovo: consultorId, motivo },
    usuario,
  })

  return atualizado
}