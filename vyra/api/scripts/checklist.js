// Checklist antes da apresentação: confere cada peça do sistema em poucos segundos.
// Uso (no servidor):  docker exec vyra_api node scripts/checklist.js
// Termina com "TUDO OK" ou com a lista do que falhou.
import { PrismaClient } from '@prisma/client'
import mongoose from 'mongoose'
import { Queue } from 'bullmq'
import { criarConexaoRedis } from '../src/shared/redis.js'
import { classificarLead, gerarEmbedding } from '../src/modules/leads/leads.ia.js'

const SITE = process.argv[2] || process.env.FRONTEND_URL || 'http://localhost:3100'
const prisma = new PrismaClient()
const falhas = []

function comLimite(promessa, ms = 15000) {
  const estouro = new Promise((_, rejeitar) =>
    setTimeout(() => rejeitar(new Error(`sem resposta em ${ms / 1000}s`)), ms)
  )
  return Promise.race([promessa, estouro])
}

async function conferir(nome, teste) {
  const inicio = Date.now()
  try {
    const detalhe = await comLimite(teste())
    console.log(`✅ ${nome} (${Date.now() - inicio} ms)${detalhe ? ' — ' + detalhe : ''}`)
  } catch (erro) {
    falhas.push(nome)
    console.log(`❌ ${nome} — ${erro.message}`)
  }
}

console.log(`Conferindo ${SITE}\n`)

await conferir('Site abre', async () => {
  const resposta = await fetch(SITE)
  if (!resposta.ok) throw new Error(`status ${resposta.status}`)
})

await conferir('API responde /health', async () => {
  const corpo = await (await fetch(`${SITE}/health`)).json()
  if (corpo.status !== 'ok') throw new Error(JSON.stringify(corpo))
})

await conferir('Login recusa senha errada', async () => {
  const resposta = await fetch(`${SITE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'checklist@vyra.com', senha: 'senha-errada' }),
  })
  if (resposta.status !== 401) throw new Error(`esperava 401, veio ${resposta.status}`)
})

await conferir('PostgreSQL e consultores', async () => {
  const consultores = await prisma.usuario.findMany({
    where: { role: 'CONSULTOR', ativo: true },
    select: { nome: true, vetorPerfil: true },
  })
  if (consultores.length === 0) throw new Error('nenhum consultor ativo')
  const semVetor = consultores.filter((c) => c.vetorPerfil.length === 0).map((c) => c.nome)
  if (semVetor.length) throw new Error(`consultores sem vetor: ${semVetor.join(', ')}`)
  const leads = await prisma.lead.count()
  return `${consultores.length} consultores com vetor, ${leads} leads`
})

await conferir('MongoDB (histórico e auditoria)', async () => {
  await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 5000 })
  const registros = await mongoose.connection.db.collection('auditoria').countDocuments()
  return `${registros} registros de auditoria`
})

await conferir('Redis e fila de leads', async () => {
  const fila = new Queue('leads', { connection: criarConexaoRedis() })
  try {
    const n = await fila.getJobCounts('waiting', 'active', 'failed')
    return `aguardando ${n.waiting}, processando ${n.active}, falhados ${n.failed}`
  } finally {
    fila.close().catch(() => {})
  }
})

await conferir('Gemini: classificação', async () => {
  const valido = await classificarLead({
    nome: 'Checklist',
    mensagem: 'Quero um orçamento de ERP com emissão de NF-e para minha indústria.',
    origem: 'checklist',
  })
  if (!valido) throw new Error('um lead claramente válido foi classificado como INVALIDO')
})

await conferir('Gemini: embedding', async () => {
  const vetor = await gerarEmbedding('teste do checklist')
  return `vetor de ${vetor.length} dimensões`
})

await prisma.$disconnect().catch(() => {})
await mongoose.disconnect().catch(() => {})

console.log(falhas.length ? `\n❌ ${falhas.length} FALHA(S): ${falhas.join(', ')}` : '\n✅ TUDO OK, pode apresentar')
process.exit(falhas.length ? 1 : 0)
