 import { PrismaClient } from '@prisma/client'
import { registrarEvento, buscarTimeline, Timeline } from './crm.timeline.js'
import { escopoLeads } from '../../shared/escopo-leads.js'


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


/**
 * Vincula um lead duplicado a outro lead do mesmo cliente.
 * O histórico do duplicado passa para o principal e o duplicado sai do funil.
 */
export async function mesclarLead(leadId, { leadPrincipalId }, usuario) {
  if (leadId === leadPrincipalId) {
    throw { statusCode: 400, message: 'Escolha um lead diferente deste.' }
  }

  // Só mescla leads que o usuário enxerga (consultor: os dele; gerente: os da equipe; admin: todos)
  const escopo = await escopoLeads(usuario)
  const [duplicado, principal] = await Promise.all([
    prisma.lead.findFirst({ where: { id: leadId, ...escopo } }),
    prisma.lead.findFirst({ where: { id: leadPrincipalId, ...escopo } }),
  ])

  if (!duplicado || !principal) {
    throw { statusCode: 404, message: 'Lead não encontrado.' }
  }
  
  // Pedido novo de cliente antigo é uma NOVA oportunidade: não pode ser engolido por um lead fechado
  if (['GANHOU', 'PERDEU'].includes(principal.status)) {
    throw {
      statusCode: 400,
      message: 'Não dá para vincular a um lead já fechado. Pedido novo de um cliente antigo é uma nova oportunidade: mantenha os dois.',
    }
  }


  // 1. O histórico do duplicado passa para o principal (MongoDB)
  await Timeline.updateMany({ leadId: duplicado.id }, { $set: { leadId: principal.id } })

  // 2. Registra no principal o que veio do duplicado
  await registrarEvento({
    leadId: principal.id,
    tipo: 'NOTA',
    descricao: `Lead duplicado de ${duplicado.nome} (${duplicado.telefone}) vinculado a este. Mensagem original: "${duplicado.mensagem}"`,
    metadata: {
      leadMescladoId: duplicado.id,
      origem: duplicado.origem,
      status: duplicado.status,
      consultorId: duplicado.consultorId,
    },
    usuario,
  })

  // 3. Por último sai do funil: se algo acima falhar, nada é apagado
  await prisma.lead.delete({ where: { id: duplicado.id } })

  return { leadPrincipalId: principal.id }
}
