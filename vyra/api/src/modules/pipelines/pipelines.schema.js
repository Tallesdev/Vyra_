export const criarPipelineSchema = {
  tags: ['Pipelines'],
  summary: 'Cria uma nova pipeline',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['nome'],
    properties: {
      nome: { type: 'string' },
      ordem: { type: 'number' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nome: { type: 'string' },
        ordem: { type: 'number' },
        ativo: { type: 'boolean' },
      },
    },
  },
}

export const listarPipelinesSchema = {
  tags: ['Pipelines'],
  summary: 'Lista todas as pipelines com suas etapas',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nome: { type: 'string' },
          ativo: { type: 'boolean' },
          ordem: { type: 'number' },
          etapas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                nome: { type: 'string' },
                ordem: { type: 'number' },
                cor: { type: 'string' },
                obrigatoria: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
}

export const criarEtapaSchema = {
  tags: ['Pipelines'],
  summary: 'Adiciona uma etapa a uma pipeline',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      pipelineId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['nome', 'ordem'],
    properties: {
      nome: { type: 'string' },
      ordem: { type: 'number' },
      cor: { type: 'string' },
    },
  },
}

export const atualizarEtapaSchema = {
  tags: ['Pipelines'],
  summary: 'Atualiza uma etapa',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      ordem: { type: 'number' },
      cor: { type: 'string' },
    },
  },
}

export const deletarEtapaSchema = {
  tags: ['Pipelines'],
  summary: 'Remove uma etapa (não obrigatória)',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
  },
}

export const moverLeadSchema = {
  tags: ['Leads'],
  summary: 'Move um lead para outra etapa do Kanban',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    required: ['etapaId'],
    properties: {
      etapaId: { type: 'string' },
      pipelineId: { type: 'string' },
    },
  },
}

export const ociosidadeSchema = {
  tags: ['Leads'],
  summary: 'Lista leads parados há mais de 3 dias',
  security: [{ bearerAuth: [] }],
}