import { PrismaClient } from '@prisma/client'
import { escopoLeads } from '../../shared/escopo-leads.js'

const prisma = new PrismaClient()

const DIAS_OCIOSIDADE = 3
const JANELA_DIAS = 30
const UM_DIA = 86400000

/** Decimal do Prisma chega como objeto/string — normaliza para número. */
function paraNumero(valor) {
  return valor === null || valor === undefined ? 0 : Number(valor)
}

function somaValores(leads) {
  return leads.reduce((total, lead) => total + paraNumero(lead.valorEstimado), 0)
}

/** Recorta o conjunto de leads por janela de criação. */
function noPeriodo(leads, inicio, fim) {
  return leads.filter((lead) => {
    const criado = new Date(lead.createdAt).getTime()
    return criado >= inicio && criado < fim
  })
}

/** Variação percentual entre dois períodos; 0 quando não há base de comparação. */
function variacao(atual, anterior) {
  if (anterior === 0) return atual === 0 ? 0 : 100
  return ((atual - anterior) / anterior) * 100
}

/** Consolida os indicadores de um conjunto de leads. */
function consolidar(leads) {
  const ganhos = leads.filter((l) => l.status === 'GANHOU')
  const perdidos = leads.filter((l) => l.status === 'PERDEU')
  const fechados = ganhos.length + perdidos.length

  const valorGanho = somaValores(ganhos)
  const emAberto = leads.filter(
    (l) => !['GANHOU', 'PERDEU'].includes(l.status)
  )

  return {
    totalLeads: leads.length,
    leadsNovos: leads.filter((l) => l.status === 'NOVO').length,
    emAndamento: leads.filter((l) => l.status === 'EM_ANDAMENTO').length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    taxaConversao: fechados > 0 ? (ganhos.length / fechados) * 100 : 0,
    valorGanho,
    valorEmAberto: somaValores(emAberto),
    ticketMedio: ganhos.length > 0 ? valorGanho / ganhos.length : 0,
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function dashboard(usuario) {
  const where = await escopoLeads(usuario)

  const leads = await prisma.lead.findMany({
    where,
    select: {
      status: true,
      valorEstimado: true,
      ultimaMovimentacao: true,
      createdAt: true,
    },
  })

  const agora = Date.now()
  const inicioAtual = agora - JANELA_DIAS * UM_DIA
  const inicioAnterior = agora - JANELA_DIAS * 2 * UM_DIA

  const atual = consolidar(noPeriodo(leads, inicioAtual, agora))
  const anterior = consolidar(noPeriodo(leads, inicioAnterior, inicioAtual))

  // Ociosidade olha o estado presente da carteira, não a janela de 30 dias.
  const limiteOcioso = agora - DIAS_OCIOSIDADE * UM_DIA
  const ociosos = leads.filter(
    (l) =>
      !['GANHOU', 'PERDEU'].includes(l.status) &&
      new Date(l.ultimaMovimentacao).getTime() < limiteOcioso
  ).length

  const total = consolidar(leads)

  return {
    ...total,
    ociosos,
    variacao: {
      totalLeads: variacao(atual.totalLeads, anterior.totalLeads),
      taxaConversao: atual.taxaConversao - anterior.taxaConversao,
      valorGanho: variacao(atual.valorGanho, anterior.valorGanho),
      ticketMedio: variacao(atual.ticketMedio, anterior.ticketMedio),
    },
  }
}

// ─── Série temporal ───────────────────────────────────────────────────────────

export async function serie(usuario) {
  const where = await escopoLeads(usuario)

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - (JANELA_DIAS - 1))
  inicio.setHours(0, 0, 0, 0)

  const leads = await prisma.lead.findMany({
    where: {
      ...where,
      OR: [
        { createdAt: { gte: inicio } },
        { ultimaMovimentacao: { gte: inicio } },
      ],
    },
    select: { status: true, createdAt: true, ultimaMovimentacao: true },
  })

  // Um balde por dia, indexado por AAAA-MM-DD.
  const baldes = new Map()
  for (let i = 0; i < JANELA_DIAS; i++) {
    const dia = new Date(inicio.getTime() + i * UM_DIA)
    baldes.set(dia.toISOString().slice(0, 10), {
      data: dia.toISOString(),
      novos: 0,
      ganhos: 0,
      perdidos: 0,
    })
  }

  for (const lead of leads) {
    const criado = baldes.get(new Date(lead.createdAt).toISOString().slice(0, 10))
    if (criado) criado.novos++

    if (lead.status === 'GANHOU' || lead.status === 'PERDEU') {
      const chave = new Date(lead.ultimaMovimentacao).toISOString().slice(0, 10)
      const fechado = baldes.get(chave)
      if (fechado) {
        if (lead.status === 'GANHOU') fechado.ganhos++
        else fechado.perdidos++
      }
    }
  }

  return [...baldes.values()]
}

// ─── Ranking de consultores ───────────────────────────────────────────────────

export async function ranking(usuario) {
  // O ranking lista consultores; o escopo define quais entram.
  const where = {}

  if (usuario.role === 'CONSULTOR') {
    where.id = usuario.id
  } else if (usuario.role === 'GERENTE') {
    where.gerenteId = usuario.id
  } else {
    where.role = 'CONSULTOR'
  }

  const consultores = await prisma.usuario.findMany({
    where: { ...where, ativo: true },
    select: {
      id: true,
      nome: true,
      email: true,
      leadsAtribuidos: { select: { status: true, valorEstimado: true } },
    },
  })

  return consultores
    .map(({ leadsAtribuidos, ...consultor }) => {
      const ganhos = leadsAtribuidos.filter((l) => l.status === 'GANHOU')
      const fechados = leadsAtribuidos.filter((l) =>
        ['GANHOU', 'PERDEU'].includes(l.status)
      ).length

      return {
        consultor,
        leads: leadsAtribuidos.length,
        ganhos: ganhos.length,
        taxaConversao: fechados > 0 ? (ganhos.length / fechados) * 100 : 0,
        valorGanho: somaValores(ganhos),
      }
    })
    .sort((a, b) => b.valorGanho - a.valorGanho)
}

// ─── Distribuição por origem ──────────────────────────────────────────────────

export async function origens(usuario) {
  const where = await escopoLeads(usuario)

  const agrupado = await prisma.lead.groupBy({
    by: ['origem'],
    where,
    _count: { _all: true },
  })

  return agrupado
    .map((linha) => ({
      origem: linha.origem ?? 'desconhecida',
      total: linha._count._all,
    }))
    .sort((a, b) => b.total - a.total)
}
