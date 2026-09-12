import * as adminService from './admin.service.js'

/** Reduz o try/catch repetido de cada handler a uma única fábrica. */
function handler(fn, statusSucesso = 200) {
  return async (request, reply) => {
    try {
      const result = await fn(request)
      return reply.status(statusSucesso).send(result)
    } catch (err) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  }
}

// Aquisições
export const listarAquisicoesHandler = handler(() => adminService.listarAquisicoes())
export const criarAquisicaoHandler = handler((req) => adminService.criarAquisicao(req.body), 201)
export const desativarAquisicaoHandler = handler((req) => adminService.desativarAquisicao(req.params.id))

// Termos bloqueados
export const listarTermosHandler = handler(() => adminService.listarTermos())
export const criarTermoHandler = handler((req) => adminService.criarTermo(req.body), 201)
export const removerTermoHandler = handler((req) => adminService.removerTermo(req.params.id))

// Perfis de oportunidade
export const listarPerfisHandler = handler(() => adminService.listarPerfis())
export const criarPerfilHandler = handler((req) => adminService.criarPerfil(req.body), 201)
export const desativarPerfilHandler = handler((req) => adminService.desativarPerfil(req.params.id))
