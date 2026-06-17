import mongoose from 'mongoose'

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
  return Timeline.create({
    leadId,
    tipo,
    descricao,
    metadata,
    usuarioId: usuario?.id,
    usuarioNome: usuario?.nome,
  })
}

export async function buscarTimeline(leadId) {
  return Timeline.find({ leadId }).sort({ createdAt: -1 }).lean()
}