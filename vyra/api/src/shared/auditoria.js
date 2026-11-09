import mongoose from 'mongoose'

/**
 * Log de auditoria: uma linha por ação que altera algo no sistema.
 *
 * A conexão com o MongoDB é aberta em crm.timeline.js, que o servidor carrega
 * junto com as rotas; até ela abrir, o Mongoose guarda as gravações em espera.
 */
const auditoriaSchema = new mongoose.Schema({
  acao: { type: String, required: true }, // ex.: "PATCH /api/leads/:id/mover"
  metodo: String,
  rota: String, // modelo da rota: /api/leads/:id/mover
  url: String, // endereço chamado: /api/leads/cmw.../mover
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: Number,
  sucesso: Boolean,
  usuarioId: { type: String, index: true },
  papel: String,
  email: String, // só no login e na recuperação de senha
  ip: String,
  duracaoMs: Number,
  idRequisicao: String,
  createdAt: { type: Date, default: Date.now, index: true },
})

export const Auditoria = mongoose.model('Auditoria', auditoriaSchema, 'auditoria')

const METODOS_QUE_ALTERAM = ['POST', 'PUT', 'PATCH', 'DELETE']

// O /refresh roda a cada F5 só para renovar a sessão: não é uma ação do usuário.
const ROTAS_IGNORADAS = ['/api/auth/refresh']

// Nestas, o e-mail digitado identifica a tentativa (login com senha errada não tem usuário).
const ROTAS_COM_EMAIL = ['/api/auth/login', '/api/auth/recuperar-senha']

/** Hook onResponse: grava toda requisição que altera algo. Nunca grava o corpo. */
export async function auditarRequisicao(request, reply) {
  const rota = request.routeOptions?.url
  if (!rota) return // rota inexistente (robôs procurando falhas)
  if (!METODOS_QUE_ALTERAM.includes(request.method)) return
  if (ROTAS_IGNORADAS.includes(rota)) return

  const email = ROTAS_COM_EMAIL.includes(rota)
    ? String(request.body?.email ?? '').toLowerCase().trim() || undefined
    : undefined

  try {
    await Auditoria.create({
      acao: `${request.method} ${rota}`,
      metodo: request.method,
      rota,
      url: request.url,
      params: request.params ?? {},
      status: reply.statusCode,
      sucesso: reply.statusCode < 400,
      usuarioId: request.user?.id,
      papel: request.user?.role,
      email,
      ip: request.ip,
      duracaoMs: Math.round(reply.elapsedTime),
      idRequisicao: request.id,
    })
  } catch (err) {
    request.log.error({ err }, 'Falha ao gravar auditoria')
  }
}

/** Eventos que não vêm de uma requisição (ex.: o worker de leads). Nunca derruba o fluxo. */
export async function auditarEvento(acao, detalhes = {}) {
  try {
    await Auditoria.create({ acao, params: detalhes, sucesso: true })
  } catch (err) {
    console.error(`[Auditoria] Falha ao gravar "${acao}":`, err.message)
  }
}
