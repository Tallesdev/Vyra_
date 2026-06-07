import { PrismaClient } from '@prisma/client'
import { validacaoCamada1 } from './leads.validation.js'
import { leadsQueue } from './leads.queue.js'

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
  // Filtro por role — mesmo endpoint, dados diferentes
  const where = {}

  if (usuario.role === 'CONSULTOR') {
    where.consultorId = usuario.id
  } else if (usuario.role === 'GERENTE') {
    // Gerente vê leads dos consultores da sua equipe
    const consultores = await prisma.usuario.findMany({
      where: { gerenteId: usuario.id },
      select: { id: true },
    })
    where.consultorId = { in: consultores.map((c) => c.id) }
  }
  // ADMIN não tem filtro — vê tudo

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      status: true,
      marcador: true,
      origem: true,
      semCriterio: true,
      createdAt: true,
      consultor: { select: { id: true, nome: true } },
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

  // Consultor só acessa seus próprios leads
  if (usuario.role === 'CONSULTOR' && lead.consultorId !== usuario.id) {
    throw { statusCode: 403, message: 'Acesso negado' }
  }

  return lead
}