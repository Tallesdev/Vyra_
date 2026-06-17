export const perfilLeadSchema = {
  tags: ['CRM'],
  summary: 'Retorna perfil completo do lead com timeline',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
}

export const atualizarLeadSchema = {
  tags: ['CRM'],
  summary: 'Atualiza dados do lead',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      email: { type: 'string' },
      telefone: { type: 'string' },
      marcador: { type: 'string', enum: ['FRIO', 'MORNO', 'QUENTE'] },
      valorEstimado: { type: 'number' },
      perfilId: { type: 'string' },
    },
  },
}

export const adicionarAtividadeSchema = {
  tags: ['CRM'],
  summary: 'Adiciona uma atividade/nota ao lead',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    required: ['descricao'],
    properties: {
      descricao: { type: 'string' },
      tipo: { type: 'string', enum: ['ATIVIDADE', 'NOTA', 'PROPOSTA'] },
      metadata: { type: 'object' },
    },
  },
}

export const fecharOportunidadeSchema = {
  tags: ['CRM'],
  summary: 'Fecha a oportunidade como Ganhou ou Perdeu',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    required: ['resultado'],
    properties: {
      resultado: { type: 'string', enum: ['GANHOU', 'PERDEU'] },
      motivoPerda: { type: 'string' },
      valorFinal: { type: 'number' },
    },
  },
}

export const reatribuirLeadSchema = {
  tags: ['CRM'],
  summary: 'Reatribui o lead para outro consultor',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    required: ['consultorId'],
    properties: {
      consultorId: { type: 'string' },
      motivo: { type: 'string' },
    },
  },
}