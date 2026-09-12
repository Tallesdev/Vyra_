import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { classificarLead } from './leads.ia.js'
import { gerarEmbedding } from './leads.ia.js'
import { similaridadeCosseno } from './leads.cosseno.js'
import { criarConexaoRedis } from '../../shared/redis.js'

const prisma = new PrismaClient()

/**
 * Descobre onde o lead entra no funil.
 *
 * Sem pipelineId/etapaId o lead nasce fora do Kanban e fica invisível para o
 * consultor, mesmo tendo sido atribuído corretamente.
 */
async function etapaDeEntrada() {
  const pipeline = await prisma.pipeline.findFirst({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
    include: {
      etapas: {
        where: { obrigatoria: false },
        orderBy: { ordem: 'asc' },
        take: 1,
      },
    },
  })

  if (!pipeline) {
    console.warn('[Worker] Nenhum pipeline ativo — o lead ficará fora do funil')
    return { pipelineId: null, etapaId: null }
  }

  return { pipelineId: pipeline.id, etapaId: pipeline.etapas[0]?.id ?? null }
}

async function processarLead(job) {
  const dados = job.data
  console.log(`[Worker] Processando lead: ${dados.nome}`)

  // ── Camada 2 — Triagem semântica via Gemini ──────────────────────────────
  const valido = await classificarLead(dados)

  if (!valido) {
    console.log(`[Worker] Lead reprovado na Camada 2 (IA): ${dados.nome}`)

    // Salva na fila de repescagem (status REPESCAGEM para revisão manual).
    // Entra no funil mesmo assim, senão ninguém o encontra para revisar.
    const funil = await etapaDeEntrada()

    await prisma.lead.create({
      data: {
        nome: dados.nome,
        email: dados.email || null,
        telefone: dados.telefone,
        mensagem: dados.mensagem,
        origem: dados.origem || 'webhook',
        status: 'REPESCAGEM',
        ...funil,
      },
    })

    return { repescagem: true }
  }

  // ── Geração de embedding do lead ─────────────────────────────────────────
  const textoLead = `${dados.nome} ${dados.mensagem}`
  const vetorLead = await gerarEmbedding(textoLead)

  // ── Busca consultores ativos com vetor de perfil ──────────────────────────
  const consultores = await prisma.usuario.findMany({
    where: {
      role: 'CONSULTOR',
      ativo: true,
      NOT: { vetorPerfil: { equals: [] } },
    },
  })

  let melhorConsultor = null
  let melhorScore = -1
  let semCriterio = false

  if (consultores.length === 0) {
    semCriterio = true
  } else {
    // ── Conta carga atual de cada consultor ───────────────────────────────
    const cargas = await Promise.all(
      consultores.map(async (c) => {
        const count = await prisma.lead.count({
          where: {
            consultorId: c.id,
            status: { in: ['NOVO', 'EM_ANDAMENTO'] },
          },
        })
        return { consultor: c, carga: count }
      })
    )

    // ── Calcula score: similaridade de cosseno ────────────────────────────
    for (const { consultor, carga } of cargas) {
      if (!consultor.vetorPerfil?.length) continue

      const score = similaridadeCosseno(vetorLead, consultor.vetorPerfil)

      // Desempate por menor carga
      if (
        score > melhorScore ||
        (score === melhorScore &&
          carga < cargas.find((c) => c.consultor.id === melhorConsultor?.id)?.carga)
      ) {
        melhorScore = score
        melhorConsultor = consultor
      }
    }

    // Score muito baixo = sem critério claro
    if (melhorScore < 0.3) {
      semCriterio = true
    }
  }

  // ── Atribuição forçada se não houver match ────────────────────────────────
  if (!melhorConsultor) {
    // Pega o consultor com menor carga como fallback
    const cargas = await Promise.all(
      (await prisma.usuario.findMany({ where: { role: 'CONSULTOR', ativo: true } }))
        .map(async (c) => {
          const count = await prisma.lead.count({
            where: { consultorId: c.id, status: { in: ['NOVO', 'EM_ANDAMENTO'] } },
          })
          return { consultor: c, carga: count }
        })
    )
    cargas.sort((a, b) => a.carga - b.carga)
    melhorConsultor = cargas[0]?.consultor || null
    semCriterio = true
  }

  // ── Salva o lead atribuído ────────────────────────────────────────────────
  const funil = await etapaDeEntrada()

  const lead = await prisma.lead.create({
    data: {
      nome: dados.nome,
      email: dados.email || null,
      telefone: dados.telefone,
      mensagem: dados.mensagem,
      origem: dados.origem || 'webhook',
      status: 'NOVO',
      semCriterio,
      consultorId: melhorConsultor?.id || null,
      ...funil,
    },
  })

  console.log(
    `[Worker] Lead ${lead.id} atribuído para ${melhorConsultor?.nome || 'nenhum'} | score: ${melhorScore.toFixed(3)} | semCriterio: ${semCriterio}`
  )

  return { leadId: lead.id, consultorId: melhorConsultor?.id, score: melhorScore }
}

export const leadsWorker = new Worker('leads', processarLead, {
  connection: criarConexaoRedis(),
})

leadsWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} concluído`, result)
})

leadsWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} falhou:`, err.message)
})