import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { classificarLead } from './leads.ia.js'
import { gerarEmbedding } from './leads.ia.js'
import { similaridadeCosseno } from './leads.cosseno.js'
import { criarConexaoRedis } from '../../shared/redis.js'
import { registrarEventoSemFalhar } from '../crm/crm.timeline.js'
import { auditarEvento } from '../../shared/auditoria.js'



const prisma = new PrismaClient()

const STATUS_ABERTOS = ['NOVO', 'EM_ANDAMENTO', 'REPESCAGEM']

/** Só os dígitos, e os 11 últimos: "+55 (11) 99999-0003" e "11999990003" viram o mesmo número. */
function normalizarTelefone(telefone) {
  return String(telefone ?? '').replace(/\D/g, '').slice(-11)
}

/**
 * Procura um lead anterior do mesmo cliente (mesmo telefone ou mesmo e-mail).
 * Prefere um lead aberto; se não houver, devolve o fechado mais recente.
 */
async function buscarLeadDoMesmoCliente(dados) {
  const telefone = normalizarTelefone(dados.telefone)
  const email = dados.email ? String(dados.email).toLowerCase().trim() : null

  // $queryRaw com crase é seguro: o Prisma envia os ${valores} como parâmetros, nunca colados no SQL
  const [anterior] = await prisma.$queryRaw`
    SELECT id, status::text AS status, "consultorId"
    FROM leads
    WHERE right(regexp_replace(telefone, '[^0-9]', '', 'g'), 11) = ${telefone}
       OR (${email}::text IS NOT NULL AND lower(email) = ${email})
    ORDER BY CASE WHEN status::text IN ('NOVO', 'EM_ANDAMENTO', 'REPESCAGEM') THEN 0 ELSE 1 END,
             "createdAt" DESC
    LIMIT 1
  `
  return anterior ?? null
}


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


/**
  Salva o lead para revisão manual (status REPESCAGEM).
 Usado em dois casos: quando a IA reprova o lead e quando a IA está fora do ar.
 */
/**
 * Salva o lead para revisão manual (status REPESCAGEM).
 * Usado em dois casos: quando a IA reprova o lead e quando a IA está fora do ar.
 */
async function salvarEmRepescagem(dados, motivo) {
  const funil = await etapaDeEntrada()

  const lead = await prisma.lead.create({
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

  await registrarEventoSemFalhar({
    leadId: lead.id,
    tipo: 'CRIACAO',
    descricao: `Lead recebido via ${lead.origem} e enviado para REPESCAGEM: ${motivo}.`,
    metadata: { origem: lead.origem, status: 'REPESCAGEM', motivo },
  })
  await auditarEvento('LEAD_EM_REPESCAGEM', { leadId: lead.id, origem: lead.origem, motivo })

  return lead
}



async function processarLead(job) {
  const dados = job.data
  console.log(`[Worker] Processando lead: ${dados.nome}`)
  
  // ── Cliente que já existe? (mesmo telefone ou e-mail) ────────────────────
  const anterior = await buscarLeadDoMesmoCliente(dados)

  // Já tem lead aberto: não cria card repetido, a mensagem vai para o histórico dele
  if (anterior && STATUS_ABERTOS.includes(anterior.status)) {
    const origem = dados.origem || 'webhook'
    await registrarEventoSemFalhar({
      leadId: anterior.id,
      tipo: 'NOTA',
      descricao: `Novo contato do mesmo cliente via ${origem}: "${dados.mensagem}"`,
      metadata: { origem, agrupado: true, nome: dados.nome, telefone: dados.telefone, email: dados.email ?? null },
    })
    await auditarEvento('LEAD_REPETIDO_AGRUPADO', { leadId: anterior.id, origem })
    console.log(`[Worker] ${dados.nome} já tem lead aberto (${anterior.id}): mensagem registrada no histórico`)
    return { agrupadoEm: anterior.id }
  }


  // ── Camada 2 — Triagem semântica via Gemini ──────────────────────────────
  const valido = await classificarLead(dados)

  if (!valido) {
    console.log(`[Worker] Lead reprovado na Camada 2 (IA): ${dados.nome}`)

    // Salva na fila de repescagem (status REPESCAGEM para revisão manual).
    // Entra no funil mesmo assim, senão ninguém o encontra para revisar.
    await salvarEmRepescagem(dados, 'a IA classificou a mensagem como inválida')



    return { repescagem: true }
  }
  
  // ── Cliente que já foi atendido: volta para o mesmo consultor ────────────
  if (anterior?.consultorId) {
    const consultorAnterior = await prisma.usuario.findFirst({
      where: { id: anterior.consultorId, ativo: true, role: 'CONSULTOR' },
    })

    // Se o consultor saiu da empresa (desativado), segue o matching normal abaixo
    if (consultorAnterior) {
      const funil = await etapaDeEntrada()
      const lead = await prisma.lead.create({
        data: {
          nome: dados.nome,
          email: dados.email || null,
          telefone: dados.telefone,
          mensagem: dados.mensagem,
          origem: dados.origem || 'webhook',
          status: 'NOVO',
          consultorId: consultorAnterior.id,
          ...funil,
        },
      })

      await registrarEventoSemFalhar({
        leadId: lead.id,
        tipo: 'CRIACAO',
        descricao: `Cliente que já foi atendido: lead recebido via ${lead.origem} e atribuído de novo a ${consultorAnterior.nome}, que cuidou do contato anterior.`,
        metadata: { origem: lead.origem, consultorId: consultorAnterior.id, leadAnteriorId: anterior.id },
      })
      await auditarEvento('LEAD_ATRIBUIDO', {
        leadId: lead.id,
        origem: lead.origem,
        consultorId: consultorAnterior.id,
        motivo: 'mesmo consultor do contato anterior',
        leadAnteriorId: anterior.id,
      })

      console.log(`[Worker] Lead ${lead.id} de cliente antigo: atribuído de novo para ${consultorAnterior.nome}`)
      return { leadId: lead.id, consultorId: consultorAnterior.id, mesmoConsultor: true }
    }
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
  
  await registrarEventoSemFalhar({
    leadId: lead.id,
    tipo: 'CRIACAO',
    descricao: semCriterio
      ? `Lead recebido via ${lead.origem} e atribuído a ${melhorConsultor?.nome ?? 'nenhum consultor'} sem critério claro (nenhum perfil compatível).`
      : `Lead recebido via ${lead.origem} e atribuído a ${melhorConsultor.nome} pela IA (similaridade ${melhorScore.toFixed(2)}).`,
    metadata: { origem: lead.origem, consultorId: melhorConsultor?.id ?? null, score: melhorScore, semCriterio },
  })

    await auditarEvento('LEAD_ATRIBUIDO', {
    leadId: lead.id,
    origem: lead.origem,
    consultorId: melhorConsultor?.id ?? null,
    score: melhorScore,
    semCriterio,
  })


  return { leadId: lead.id, consultorId: melhorConsultor?.id, score: melhorScore }
}

export const leadsWorker = new Worker('leads', processarLead, {
  connection: criarConexaoRedis(),
})

leadsWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} concluído`, result)
})

leadsWorker.on('failed', async (job, err) => {
  if (!job) return

  const maximo = job.opts.attempts ?? 1
  console.error(`[Worker] Job ${job.id} falhou (tentativa ${job.attemptsMade} de ${maximo}):`, err.message)

  // O BullMQ dispara este evento a cada tentativa. Se ainda vai tentar de novo, espera.
  if (job.attemptsMade < maximo) return

  // Todas as tentativas falharam (ex.: Gemini fora do ar). Em vez de perder o
  // lead, salva em REPESCAGEM para alguém revisar manualmente.
  try {
    const lead = await salvarEmRepescagem(job.data, `IA indisponível após ${maximo} tentativas`)
    console.warn(`[Worker] Lead ${lead.id} (${job.data.nome}) salvo em REPESCAGEM após ${maximo} falhas`)
  } catch (erroAoSalvar) {
    console.error(`[Worker] Não foi possível salvar o lead do job ${job.id} nem em repescagem:`, erroAoSalvar.message)
  }
})
