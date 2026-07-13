import {
  criarUsuarioHandler,
  listarUsuariosHandler,
  atualizarUsuarioHandler,
  desativarUsuarioHandler,
  atualizarPerfilIAHandler,
} from './users.controller.js'

import {
  criarUsuarioSchema,
  listarUsuariosSchema,
  atualizarUsuarioSchema,
  desativarUsuarioSchema,
  atualizarPerfilIASchema,
} from './users.schema.js'

export async function usersRoutes(app) {
  const apenasAdmin  = { preHandler: [app.authenticate, app.authorize('ADMIN')] }
  const adminGerente = { preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }

  app.post('/', { schema: criarUsuarioSchema, ...apenasAdmin }, criarUsuarioHandler)
  app.get('/', { schema: listarUsuariosSchema, ...adminGerente }, listarUsuariosHandler)
  app.put('/:id', { schema: atualizarUsuarioSchema, ...apenasAdmin }, atualizarUsuarioHandler)
  app.delete('/:id', { schema: desativarUsuarioSchema, ...apenasAdmin }, desativarUsuarioHandler)
  app.patch('/:id/perfil-ia', { schema: atualizarPerfilIASchema, ...apenasAdmin }, atualizarPerfilIAHandler)
}