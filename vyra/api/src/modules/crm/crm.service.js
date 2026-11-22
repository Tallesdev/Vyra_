 import { PrismaClient } from '@prisma/client'
import { registrarEvento, buscarTimeline, Timeline } from './crm.timeline.js'
import { escopoLeads, garantirAcessoAoLead } from '../../shared/escopo-leads.js'
import { leadsQueue } from '../leads/leads.queue.js'


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

  await garantirAcessoAoLead(lead, usuario)

  const timeline = await buscarTimeline(leadId)

  return { ...lead, timeline }
}

export async function atualizarLead(leadId, dados, usuario) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }

  await garantirAcessoAoLead(lead, usuario)

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

  await garantirAcessoAoLead(lead, usuario)

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

  await garantirAcessoAoLead(lead, usuario)

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
  await garantirAcessoAoLead(lead, usuario)

  const consultor = await prisma.usuario.findUnique({ where: { id: consultorId } })
  if (!consultor || consultor.role !== 'CONSULTOR' || !consultor.ativo) {
    throw { statusCode: 400, message: 'Consultor inválido' }
  }
  // Gerente só passa leads para consultores da própria equipe
  if (usuario.role === 'GERENTE' && consultor.gerenteId !== usuario.id) {
    throw { statusCode: 403, message: 'Esse consultor não é da sua equipe.' }
  }

  // Lead na repescagem que ganha um consultor foi revisado por alguém: volta para o funil como NOVO
  const resgatado = lead.status === 'REPESCAGEM'

  const atualizado = await prisma.lead.update({
    where: { id: leadId },
    data: {
      consultorId,
      ...(resgatado && { status: 'NOVO', semCriterio: false, ultimaMovimentacao: new Date() }),
    },
  })

  await registrarEvento({
    leadId,
    tipo: 'ATIVIDADE',
    descricao: resgatado
      ? `Lead resgatado da repescagem e atribuído a ${consultor.nome}`
      : `Lead reatribuído para ${consultor.nome}`,
    metadata: { consultorAnterior: lead.consultorId, consultorNovo: consultorId, motivo, resgatado },
    usuario,
  })

  return atualizado
}

/**
 * Manda de novo para a IA um lead que caiu na repescagem porque o Gemini estava fora do ar.
 * Leads reprovados pela IA não podem ser reprocessados: a decisão foi da triagem, não de uma falha.
 */
export async function reprocessarLead(leadId, usuario) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }
  await garantirAcessoAoLead(lead, usuario)

  if (lead.status !== 'REPESCAGEM') {
    throw { statusCode: 400, message: 'Só leads na repescagem podem ser reprocessados.' }
  }

  const criacao = await Timeline.findOne({ leadId, tipo: 'CRIACAO' }).lean()
  if (!String(criacao?.metadata?.motivo ?? '').includes('indisponível')) {
    throw {
      statusCode: 400,
      message: 'Este lead foi reprovado pela IA. Só os que caíram por indisponibilidade da IA podem ser reprocessados.',
    }
  }

  await leadsQueue.add(
    'reprocessar-lead',
    {
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      mensagem: lead.mensagem,
      origem: lead.origem,
      reprocessarLeadId: lead.id,
    },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  )

  await registrarEvento({
    leadId,
    tipo: 'ATIVIDADE',
    descricao: 'Lead enviado de novo para a análise da IA',
    metadata: { reprocessamento: true },
    usuario,
  })

  return { message: 'Lead enviado para nova análise da IA. Em alguns segundos ele sai da repescagem, se for aprovado.' }
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
