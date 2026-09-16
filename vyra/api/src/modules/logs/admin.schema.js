export const criarPerfilOportunidadeSchema = {
  tags: ['Admin'],
  summary: 'Cria um perfil de oportunidade',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['nome'],
    properties: {
      nome:      { type: 'string' },
      descricao: { type: 'string' },
    },
  },
}

export const criarAquisicaoSchema = {
  tags: ['Admin'],
  summary: 'Cria uma origem de aquisição',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['nome'],
    properties: {
      nome: { type: 'string' },
    },
  },
}

export const criarTermoBloqueadoSchema = {
  tags: ['Admin'],
  summary: 'Adiciona um termo bloqueado no webhook',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['termo'],
    properties: {
      termo: { type: 'string' },
    },
  },
}