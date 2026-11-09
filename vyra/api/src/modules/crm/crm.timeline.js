import mongoose from 'mongoose'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


// Conecta ao MongoDB (só uma vez)
if (mongoose.connection.readyState === 0) {
  await mongoose.connect(process.env.MONGODB_URL)
  console.log('MongoDB conectado')
}

const timelineSchema = new mongoose.Schema({
  leadId: { type: String, required: true, index: true },
  tipo: {
    type: String,
    enum: ['CRIACAO', 'MOVIMENTACAO', 'EMAIL', 'WHATSAPP', 'ATIVIDADE', 'PROPOSTA', 'FECHAMENTO', 'NOTA'],
    required: true,
  },
  descricao: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  usuarioId: { type: String },
  usuarioNome: { type: String },
  createdAt: { type: Date, default: Date.now },
})

export const Timeline = mongoose.model('Timeline', timelineSchema)

export async function registrarEvento({ leadId, tipo, descricao, metadata = {}, usuario }) {
  // O token de login só traz id e papel; o nome vem do banco para aparecer como autor.
  let usuarioNome = usuario?.nome
  if (usuario?.id && !usuarioNome) {
    const encontrado = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { nome: true },
    })
    usuarioNome = encontrado?.nome
  }

  return Timeline.create({
    leadId,
    tipo,
    descricao,
    metadata,
    usuarioId: usuario?.id,
    usuarioNome,
  })
}

// Para fluxos que não podem parar por causa do histórico (worker e Kanban):
// se o MongoDB falhar, só avisa no console e o fluxo segue.
export async function registrarEventoSemFalhar(evento) {
  try {
    await registrarEvento(evento)
  } catch (err) {
    console.error(`[Timeline] Não foi possível registrar ${evento.tipo} do lead ${evento.leadId}:`, err.message)
  }
}



export async function buscarTimeline(leadId) {
  return Timeline.find({ leadId }).sort({ createdAt: -1 }).lean()
}