import { PrismaClient } from '@prisma/client'
import { validacaoCamada1 } from './leads.validation.js'
import { leadsQueue } from './leads.queue.js'
import { escopoLeads, garantirAcessoAoLead } from '../../shared/escopo-leads.js'

const prisma = new PrismaClient()

export async function receberWebhook(dados) {
  // Camada 1 — validação síncrona
  const erros = await validacaoCamada1(dados)

  if (erros.length > 0) {
    throw { statusCode: 400, message: 'Lead rejeitado na validação', erros }
  }

  // Enfileira para processamento assíncrono
  const job = await leadsQueue.add('novo-lead', dados, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })

  return { message: 'Lead recebido e enfileirado', jobId: job.id }
}

export async function listarLeads(usuario) {
  // Filtro por role — mesmo endpoint, dados diferentes (regra única em escopo-leads.js)
  const where = await escopoLeads(usuario)

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      mensagem: true,
      status: true,
      marcador: true,
      origem: true,
      semCriterio: true,
      // O funil precisa saber em que coluna o lead está, quanto vale
      // e há quanto tempo não se move.
      consultorId: true,
      pipelineId: true,
      etapaId: true,
      valorEstimado: true,
      motivoPerda: true,
      ultimaMovimentacao: true,
      createdAt: true,
      updatedAt: true,
      consultor: { select: { id: true, nome: true, email: true } },
    },
  })
}

export async function buscarLead(id, usuario) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      consultor: { select: { id: true, nome: true } },
      pipeline: { select: { id: true, nome: true } },
      etapa: { select: { id: true, nome: true } },
    },
  })

  if (!lead) {
    throw { statusCode: 404, message: 'Lead não encontrado' }
  }

  await garantirAcessoAoLead(lead, usuario)

  return lead
}