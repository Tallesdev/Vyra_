import {
  criarPipelineHandler,
  listarPipelinesHandler,
  atualizarPipelineHandler,
  deletarPipelineHandler,
  criarEtapaHandler,
  atualizarEtapaHandler,
  deletarEtapaHandler,
} from './pipelines.controller.js'

import {
  criarPipelineSchema,
  listarPipelinesSchema,
  criarEtapaSchema,
  atualizarEtapaSchema,
  deletarEtapaSchema,
} from './pipelines.schema.js'

export async function pipelinesRoutes(app) {
  const adminGerente = { preHandler: [app.authenticate, app.authorize('ADMIN', 'GERENTE')] }
  const todos = { preHandler: [app.authenticate] }

  // Pipelines
  app.post('/', { schema: criarPipelineSchema, ...adminGerente }, criarPipelineHandler)
  app.get('/', { schema: listarPipelinesSchema, ...todos }, listarPipelinesHandler)
  app.put('/:id', { ...adminGerente }, atualizarPipelineHandler)
  app.delete('/:id', { preHandler: [app.authenticate, app.authorize('ADMIN')] }, deletarPipelineHandler)

  // Etapas
  app.post('/:pipelineId/etapas', { schema: criarEtapaSchema, ...adminGerente }, criarEtapaHandler)
  app.put('/etapas/:id', { schema: atualizarEtapaSchema, ...adminGerente }, atualizarEtapaHandler)
  app.delete('/etapas/:id', { schema: deletarEtapaSchema, ...adminGerente }, deletarEtapaHandler)
}