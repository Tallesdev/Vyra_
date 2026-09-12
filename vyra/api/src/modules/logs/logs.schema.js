const seguranca = [{ bearerAuth: [] }]

export const dashboardSchema = {
  tags: ['Dashboard'],
  summary: 'KPIs consolidados da operação (filtrado por role)',
  security: seguranca,
  response: {
    200: {
      type: 'object',
      properties: {
        totalLeads: { type: 'integer' },
        leadsNovos: { type: 'integer' },
        emAndamento: { type: 'integer' },
        ganhos: { type: 'integer' },
        perdidos: { type: 'integer' },
        ociosos: { type: 'integer' },
        taxaConversao: { type: 'number' },
        valorEmAberto: { type: 'number' },
        valorGanho: { type: 'number' },
        ticketMedio: { type: 'number' },
        variacao: {
          type: 'object',
          properties: {
            totalLeads: { type: 'number' },
            taxaConversao: { type: 'number' },
            valorGanho: { type: 'number' },
            ticketMedio: { type: 'number' },
          },
        },
      },
    },
  },
}

export const serieSchema = {
  tags: ['Dashboard'],
  summary: 'Série diária dos últimos 30 dias',
  security: seguranca,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          data: { type: 'string' },
          novos: { type: 'integer' },
          ganhos: { type: 'integer' },
          perdidos: { type: 'integer' },
        },
      },
    },
  },
}

export const rankingSchema = {
  tags: ['Dashboard'],
  summary: 'Ranking de consultores por receita ganha',
  security: seguranca,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          consultor: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nome: { type: 'string' },
              email: { type: 'string' },
            },
          },
          leads: { type: 'integer' },
          ganhos: { type: 'integer' },
          taxaConversao: { type: 'number' },
          valorGanho: { type: 'number' },
        },
      },
    },
  },
}

export const origensSchema = {
  tags: ['Dashboard'],
  summary: 'Distribuição de leads por canal de aquisição',
  security: seguranca,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          origem: { type: 'string' },
          total: { type: 'integer' },
        },
      },
    },
  },
}
