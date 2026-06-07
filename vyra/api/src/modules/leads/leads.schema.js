export const webhookSchema = {
  tags: ['Leads'],
  summary: 'Recebe um lead via webhook (endpoint público)',
  body: {
    type: 'object',
    required: ['nome', 'telefone', 'mensagem'],
    properties: {
      nome: { type: 'string' },
      email: { type: 'string' },
      telefone: { type: 'string' },
      mensagem: { type: 'string' },
      origem: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        leadId: { type: 'string' },
      },
    },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        erros: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

export const listarLeadsSchema = {
  tags: ['Leads'],
  summary: 'Lista leads (filtrado por role automaticamente)',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nome: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          status: { type: 'string' },
          marcador: { type: 'string' },
          origem: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
  },
}

export const buscarLeadSchema = {
  tags: ['Leads'],
  summary: 'Busca um lead pelo ID',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
  },
}