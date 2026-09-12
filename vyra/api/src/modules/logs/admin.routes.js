import {
  listarAquisicoesHandler,
  criarAquisicaoHandler,
  desativarAquisicaoHandler,
  listarTermosHandler,
  criarTermoHandler,
  removerTermoHandler,
  listarPerfisHandler,
  criarPerfilHandler,
  desativarPerfilHandler,
} from './admin.controller.js'

const seguranca = [{ bearerAuth: [] }]

const corpoNome = {
  type: 'object',
  required: ['nome'],
  properties: {
    nome: { type: 'string', minLength: 2 },
    descricao: { type: 'string' },
  },
}

const corpoTermo = {
  type: 'object',
  required: ['termo'],
  properties: { termo: { type: 'string', minLength: 2 } },
}

export async function adminRoutes(app) {
  const apenasAdmin = { preHandler: [app.authenticate, app.authorize('ADMIN')] }
  // Consultores precisam ler as listas para preencher formulários.
  const leitura = { preHandler: [app.authenticate] }

  // ── Aquisições ──────────────────────────────────────────────────────────
  app.get(
    '/aquisicoes',
    { schema: { tags: ['Admin'], summary: 'Lista canais de aquisição', security: seguranca }, ...leitura },
    listarAquisicoesHandler
  )
  app.post(
    '/aquisicoes',
    { schema: { tags: ['Admin'], summary: 'Cria um canal de aquisição', security: seguranca, body: corpoNome }, ...apenasAdmin },
    criarAquisicaoHandler
  )
  app.delete(
    '/aquisicoes/:id',
    { schema: { tags: ['Admin'], summary: 'Desativa um canal de aquisição', security: seguranca }, ...apenasAdmin },
    desativarAquisicaoHandler
  )

  // ── Termos bloqueados ───────────────────────────────────────────────────
  app.get(
    '/termos',
    { schema: { tags: ['Admin'], summary: 'Lista termos bloqueados', security: seguranca }, ...apenasAdmin },
    listarTermosHandler
  )
  app.post(
    '/termos',
    { schema: { tags: ['Admin'], summary: 'Bloqueia um termo', security: seguranca, body: corpoTermo }, ...apenasAdmin },
    criarTermoHandler
  )
  app.delete(
    '/termos/:id',
    { schema: { tags: ['Admin'], summary: 'Remove um termo bloqueado', security: seguranca }, ...apenasAdmin },
    removerTermoHandler
  )

  // ── Perfis de oportunidade ──────────────────────────────────────────────
  app.get(
    '/perfis',
    { schema: { tags: ['Admin'], summary: 'Lista perfis de oportunidade', security: seguranca }, ...leitura },
    listarPerfisHandler
  )
  app.post(
    '/perfis',
    { schema: { tags: ['Admin'], summary: 'Cria um perfil de oportunidade', security: seguranca, body: corpoNome }, ...apenasAdmin },
    criarPerfilHandler
  )
  app.delete(
    '/perfis/:id',
    { schema: { tags: ['Admin'], summary: 'Desativa um perfil de oportunidade', security: seguranca }, ...apenasAdmin },
    desativarPerfilHandler
  )
}
