export const enviarEmailSchema = {
  body: {
    type: 'object',
    required: ['leadId', 'para', 'assunto', 'corpo'],
    properties: {
      leadId:     { type: 'string', format: 'uuid' },
      para:       { type: 'string', format: 'email' },
      assunto:    { type: 'string', minLength: 1 },
      corpo:      { type: 'string', minLength: 1 },
      templateId: { type: 'string', format: 'uuid' }
    }
  }
}

export const registrarWhatsappSchema = {
  body: {
    type: 'object',
    required: ['leadId', 'telefone', 'mensagemEnviada'],
    properties: {
      leadId:          { type: 'string', format: 'uuid' },
      telefone:        { type: 'string', minLength: 10 },
      mensagemEnviada: { type: 'string', minLength: 1 },
      templateId:      { type: 'string', format: 'uuid' }
    }
  }
}

export const criarTemplateSchema = {
  body: {
    type: 'object',
    required: ['nome', 'tipo', 'corpo'],
    properties: {
      nome:    { type: 'string', minLength: 1 },
      tipo:    { type: 'string', enum: ['EMAIL', 'WHATSAPP'] },
      assunto: { type: 'string' },
      corpo:   { type: 'string', minLength: 1 }
    }
  }
}

export const editarTemplateSchema = {
  body: {
    type: 'object',
    properties: {
      nome:    { type: 'string', minLength: 1 },
      assunto: { type: 'string' },
      corpo:   { type: 'string', minLength: 1 },
      ativo:   { type: 'boolean' }
    }
  }
}