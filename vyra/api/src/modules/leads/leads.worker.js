import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const connection = {
  host: 'redis',
  port: 6379,
}

async function processarLead(job) {
  const dados = job.data
  console.log(`[Worker] Processando lead: ${dados.nome}`)

  // Salva o lead no banco com status NOVO
  const lead = await prisma.lead.create({
    data: {
      nome: dados.nome,
      email: dados.email || null,
      telefone: dados.telefone,
      mensagem: dados.mensagem,
      origem: dados.origem || 'webhook',
      status: 'NOVO',
    },
  })

  console.log(`[Worker] Lead salvo: ${lead.id}`)
  // Fase 4 vai adicionar a triagem por IA aqui
  return lead
}

export const leadsWorker = new Worker('leads', processarLead, { connection })

leadsWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} concluído`)
})

leadsWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} falhou:`, err.message)
})