export const criarUsuarioSchema = {
  tags: ['Usuários'],
  summary: 'Cria um novo usuário (Admin only)',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['nome', 'email', 'senha', 'role'],
    properties: {
      nome:      { type: 'string' },
      email:     { type: 'string', format: 'email' },
      senha:     { type: 'string', minLength: 6 },
      role:      { type: 'string', enum: ['ADMIN', 'GERENTE', 'CONSULTOR'] },
      gerenteId: { type: 'string' },
      perfilDescricao: { type: 'string' },
    },
  },
}

export const listarUsuariosSchema = {
  tags: ['Usuários'],
  summary: 'Lista usuários filtrados por role',
  security: [{ bearerAuth: [] }],
}

export const atualizarUsuarioSchema = {
  tags: ['Usuários'],
  summary: 'Atualiza dados de um usuário',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      nome:      { type: 'string' },
      email:     { type: 'string', format: 'email' },
      gerenteId: { type: 'string' },
      perfilDescricao: { type: 'string' },
    },
  },
}

export const desativarUsuarioSchema = {
  tags: ['Usuários'],
  summary: 'Desativa um usuário',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
  },
}

export const atualizarPerfilIASchema = {
  tags: ['Usuários'],
  summary: 'Atualiza o vetor de perfil do consultor para match de IA',
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
    },
  },
}