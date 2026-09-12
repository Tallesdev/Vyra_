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

// ATENÇÃO: o Fastify serializa a resposta a partir deste schema e descarta,
// sem avisar, qualquer campo não declarado aqui. Ao adicionar um campo no
// `select` de leads.service.js, declare-o também abaixo — senão ele some.
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
          email: { type: 'string', nullable: true },
          telefone: { type: 'string' },
          mensagem: { type: 'string' },
          status: { type: 'string' },
          marcador: { type: 'string' },
          origem: { type: 'string', nullable: true },
          semCriterio: { type: 'boolean' },

          // Posição no funil — sem isto o Kanban não monta as colunas
          consultorId: { type: 'string', nullable: true },
          pipelineId: { type: 'string', nullable: true },
          etapaId: { type: 'string', nullable: true },

          // Oportunidade
          valorEstimado: { type: 'number', nullable: true },
          motivoPerda: { type: 'string', nullable: true },

          ultimaMovimentacao: { type: 'string' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },

          consultor: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              nome: { type: 'string' },
              email: { type: 'string' },
            },
          },
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