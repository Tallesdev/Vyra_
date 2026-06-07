export const loginSchema = {
  tags: ['Auth'],
  summary: 'Login de usuário',
  body: {
    type: 'object',
    required: ['email', 'senha'],
    properties: {
      email: { type: 'string', format: 'email' },
      senha: { type: 'string', minLength: 6 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        usuario: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nome: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  },
}

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Renova o access token',
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  },
}

export const logoutSchema = {
  tags: ['Auth'],
  summary: 'Logout — invalida o refresh token',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const recuperarSenhaSchema = {
  tags: ['Auth'],
  summary: 'Envia e-mail de recuperação de senha',
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
}

export const perfilSchema = {
  tags: ['Auth'],
  summary: 'Retorna os dados do usuário autenticado',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nome: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
      },
    },
  },
}