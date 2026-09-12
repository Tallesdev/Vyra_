/**
 * Base de dados simulada — permite desenvolver e demonstrar o front
 * sem que a API, o Postgres, o Mongo e o Redis estejam no ar.
 *
 * Ative/desative com NEXT_PUBLIC_USE_MOCK no .env.local.
 */

import type {
  DistribuicaoOrigem,
  Etapa,
  EventoTimeline,
  Lead,
  Marcador,
  Pipeline,
  RankingConsultor,
  SerieTemporal,
  Template,
  Usuario,
} from "./types";

/* ── Usuários ──────────────────────────────────────────────── */

export const usuarios: Usuario[] = [
  {
    id: "u_admin",
    nome: "Rubens Camargo",
    email: "admin@vyra.com",
    role: "ADMIN",
    ativo: true,
    gerenteId: null,
    perfilDescricao: "Administrador do sistema.",
    createdAt: "2026-01-08T12:00:00Z",
  },
  {
    id: "u_ger1",
    nome: "Marina Albuquerque",
    email: "marina@vyra.com",
    role: "GERENTE",
    ativo: true,
    gerenteId: null,
    perfilDescricao:
      "Gerente comercial da equipe de tecnologia e software corporativo.",
    createdAt: "2026-01-14T12:00:00Z",
  },
  {
    id: "u_ger2",
    nome: "Paulo Ferreira",
    email: "paulo@vyra.com",
    role: "GERENTE",
    ativo: true,
    gerenteId: null,
    perfilDescricao: "Gerente da equipe de varejo e pequenos negócios.",
    createdAt: "2026-01-20T12:00:00Z",
  },
  {
    id: "u_c1",
    nome: "Ana Paula Souza",
    email: "ana@vyra.com",
    role: "CONSULTOR",
    ativo: true,
    gerenteId: "u_ger1",
    perfilDescricao:
      "Especialista em ERP e integrações fiscais para indústrias de médio porte. Domina NF-e, SPED e migração de legado.",
    createdAt: "2026-02-02T12:00:00Z",
  },
  {
    id: "u_c2",
    nome: "Bruno Tavares",
    email: "bruno@vyra.com",
    role: "CONSULTOR",
    ativo: true,
    gerenteId: "u_ger1",
    perfilDescricao:
      "Foco em SaaS B2B, CRM e automação de marketing. Perfil consultivo para times de vendas de 10 a 50 pessoas.",
    createdAt: "2026-02-05T12:00:00Z",
  },
  {
    id: "u_c3",
    nome: "Carla Mendes",
    email: "carla@vyra.com",
    role: "CONSULTOR",
    ativo: true,
    gerenteId: "u_ger2",
    perfilDescricao:
      "Atende varejo físico e e-commerce. Forte em PDV, controle de estoque e integração com marketplaces.",
    createdAt: "2026-02-11T12:00:00Z",
  },
  {
    id: "u_c4",
    nome: "Diego Nakamura",
    email: "diego@vyra.com",
    role: "CONSULTOR",
    ativo: true,
    gerenteId: "u_ger2",
    perfilDescricao:
      "Especialista em infraestrutura, nuvem e segurança. Conduz projetos de migração para AWS e conformidade LGPD.",
    createdAt: "2026-03-01T12:00:00Z",
  },
  {
    id: "u_c5",
    nome: "Elisa Rocha",
    email: "elisa@vyra.com",
    role: "CONSULTOR",
    ativo: false,
    gerenteId: "u_ger1",
    perfilDescricao: "Consultora de contratos públicos e licitações.",
    createdAt: "2026-03-14T12:00:00Z",
  },
];

export const consultores = usuarios.filter((u) => u.role === "CONSULTOR" && u.ativo);

/* ── Pipelines e etapas ────────────────────────────────────── */

function etapa(
  id: string,
  nome: string,
  ordem: number,
  cor: string,
  pipelineId: string,
  obrigatoria = false,
): Etapa {
  return { id, nome, ordem, cor, obrigatoria, pipelineId };
}

export const pipelines: Pipeline[] = [
  {
    id: "p_padrao",
    nome: "Comercial padrão",
    ordem: 1,
    ativo: true,
    etapas: [
      etapa("e_novo", "Novo contato", 1, "#8b5cf6", "p_padrao"),
      etapa("e_qualif", "Qualificação", 2, "#6366f1", "p_padrao"),
      etapa("e_diag", "Diagnóstico", 3, "#0ea5e9", "p_padrao"),
      etapa("e_prop", "Proposta enviada", 4, "#14b8a6", "p_padrao"),
      etapa("e_negoc", "Negociação", 5, "#f59e0b", "p_padrao"),
      etapa("e_ganhou", "Ganhou", 9998, "#22c55e", "p_padrao", true),
      etapa("e_perdeu", "Perdeu", 9999, "#ef4444", "p_padrao", true),
    ],
  },
  {
    id: "p_enterprise",
    nome: "Enterprise",
    ordem: 2,
    ativo: true,
    etapas: [
      etapa("e2_pros", "Prospecção", 1, "#8b5cf6", "p_enterprise"),
      etapa("e2_desc", "Descoberta", 2, "#6366f1", "p_enterprise"),
      etapa("e2_poc", "Prova de conceito", 3, "#0ea5e9", "p_enterprise"),
      etapa("e2_juri", "Jurídico", 4, "#f59e0b", "p_enterprise"),
      etapa("e2_ganhou", "Ganhou", 9998, "#22c55e", "p_enterprise", true),
      etapa("e2_perdeu", "Perdeu", 9999, "#ef4444", "p_enterprise", true),
    ],
  },
];

/* ── Geração de leads ──────────────────────────────────────── */

const nomes = [
  "Fernanda Lima", "Ricardo Prado", "Juliana Castro", "Marcelo Andrade",
  "Patrícia Nogueira", "Thiago Barros", "Camila Duarte", "Rodrigo Siqueira",
  "Beatriz Fontes", "Gustavo Rezende", "Larissa Pires", "André Vasconcelos",
  "Natália Moreira", "Felipe Cardoso", "Vanessa Ramos", "Leonardo Braga",
  "Sabrina Teixeira", "Otávio Marques", "Renata Coelho", "Vinícius Aguiar",
  "Priscila Monteiro", "Eduardo Lacerda", "Tatiane Bezerra", "Henrique Sales",
  "Mariana Figueiredo", "Caio Antunes", "Débora Pontes", "Rafael Quintana",
  "Isabela Furtado", "Gabriel Peixoto", "Aline Bittencourt", "Murilo Sanches",
  "Letícia Vergara", "Danilo Cavalcanti", "Simone Drummond", "Arthur Bandeira",
];

const empresas = [
  "Metalúrgica Horizonte", "Grupo Solaris", "TechNova Sistemas", "Rede Bom Preço",
  "Indústria Vertex", "Clínica Vitalis", "Log&Go Transportes", "Alpha Contábil",
  "Casa & Cia Varejo", "BioCampo Agro", "Construtora Meridiano", "Fintech Órbita",
  "Escola Futuro", "Rede Farma Vida", "Auto Peças Titan", "Studio Criativo Prisma",
];

const origens = [
  "meta_ads", "google_ads", "landing_page", "indicacao",
  "whatsapp", "google_forms", "evento", "site_organico",
];

const mensagens = [
  "Gostaria de entender melhor como funciona a implantação e qual o prazo médio.",
  "Preciso de um orçamento para 25 usuários. Temos urgência para fechar este mês.",
  "Vi o anúncio de vocês. Nosso ERP atual não integra com o marketplace, isso é possível?",
  "Somos uma indústria com 3 filiais e queremos unificar o estoque.",
  "Estamos comparando fornecedores. Vocês atendem o setor de saúde?",
  "Quero migrar da planilha para um sistema de verdade. Por onde começo?",
  "Nosso time de vendas tem 12 pessoas e perdemos muito lead por falta de acompanhamento.",
  "Preciso de emissão de NF-e e integração com a contabilidade.",
  "Recebi indicação de um cliente de vocês. Podemos marcar uma conversa?",
  "Qual o custo mensal para uma operação de e-commerce com 5 mil pedidos/mês?",
  "Temos problema de conformidade com a LGPD e precisamos de apoio.",
  "Queria uma demonstração antes de levar para a diretoria.",
];

/** Gerador determinístico — o mock não muda a cada recarga. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildLeads(): Lead[] {
  const rand = seeded(20260826);
  const pipeline = pipelines[0];
  const etapasAbertas = pipeline.etapas.filter((e) => !e.obrigatoria);
  const leads: Lead[] = [];

  for (let i = 0; i < 64; i++) {
    const nome = nomes[i % nomes.length];
    const empresa = empresas[Math.floor(rand() * empresas.length)];
    const r = rand();

    // Distribuição realista: a maioria em andamento, alguns fechados.
    let status: Lead["status"];
    let etapaId: string;
    if (r < 0.16) {
      status = "NOVO";
      etapaId = "e_novo";
    } else if (r < 0.62) {
      status = "EM_ANDAMENTO";
      etapaId = etapasAbertas[1 + Math.floor(rand() * (etapasAbertas.length - 1))].id;
    } else if (r < 0.79) {
      status = "GANHOU";
      etapaId = "e_ganhou";
    } else if (r < 0.93) {
      status = "PERDEU";
      etapaId = "e_perdeu";
    } else {
      status = "REPESCAGEM";
      etapaId = "e_qualif";
    }

    const marcador: Marcador =
      status === "GANHOU" || rand() > 0.72
        ? "QUENTE"
        : rand() > 0.45
          ? "MORNO"
          : "FRIO";

    const diasAtras = Math.floor(rand() * 75);
    const createdAt = new Date(Date.now() - diasAtras * 86400000);
    // Leads fechados param de se mover; abertos têm ociosidade variável.
    const diasParado =
      status === "GANHOU" || status === "PERDEU"
        ? 0
        : Math.floor(rand() * Math.min(diasAtras + 1, 14));
    const ultimaMovimentacao = new Date(Date.now() - diasParado * 86400000);

    const semCriterio = rand() > 0.9;
    const consultor = semCriterio
      ? null
      : consultores[Math.floor(rand() * consultores.length)];

    const ddd = 11 + Math.floor(rand() * 78);
    const numero = 90000000 + Math.floor(rand() * 9999999);

    leads.push({
      id: `l_${String(i + 1).padStart(3, "0")}`,
      nome,
      email: rand() > 0.12
        ? `${nome.split(" ")[0].toLowerCase()}@${empresa
            .toLowerCase()
            .replace(/[^a-z]/g, "")
            .slice(0, 12)}.com.br`
        : null,
      telefone: `${ddd}${numero}`,
      mensagem: mensagens[Math.floor(rand() * mensagens.length)],
      origem: origens[Math.floor(rand() * origens.length)],
      status,
      marcador,
      semCriterio,
      consultorId: consultor?.id ?? null,
      consultor: consultor
        ? { id: consultor.id, nome: consultor.nome, email: consultor.email }
        : null,
      pipelineId: pipeline.id,
      etapaId,
      valorEstimado:
        rand() > 0.18 ? Math.round((4000 + rand() * 116000) / 500) * 500 : null,
      motivoPerda:
        status === "PERDEU"
          ? ["Preço acima do orçamento", "Escolheu concorrente", "Projeto adiado", "Sem retorno"][
              Math.floor(rand() * 4)
            ]
          : null,
      ultimaMovimentacao: ultimaMovimentacao.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: ultimaMovimentacao.toISOString(),
    });
  }

  return leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const leads: Lead[] = buildLeads();

/* ── Timeline ──────────────────────────────────────────────── */

export function buildTimeline(lead: Lead): EventoTimeline[] {
  const eventos: EventoTimeline[] = [
    {
      id: `${lead.id}_ev1`,
      leadId: lead.id,
      tipo: "CRIACAO",
      descricao: `Lead recebido via ${lead.origem ?? "origem desconhecida"}.`,
      autor: "Sistema",
      criadoEm: lead.createdAt,
    },
  ];

  if (lead.consultor) {
    eventos.push({
      id: `${lead.id}_ev2`,
      leadId: lead.id,
      tipo: "ATRIBUICAO",
      descricao: `Atribuído a ${lead.consultor.nome} por compatibilidade semântica (IA).`,
      autor: "Vyra IA",
      metadata: { score: 0.82 },
      criadoEm: new Date(new Date(lead.createdAt).getTime() + 45000).toISOString(),
    });
  } else {
    eventos.push({
      id: `${lead.id}_ev2`,
      leadId: lead.id,
      tipo: "ATRIBUICAO",
      descricao: "Nenhum consultor compatível encontrado. Lead marcado como sem critério.",
      autor: "Vyra IA",
      criadoEm: new Date(new Date(lead.createdAt).getTime() + 45000).toISOString(),
    });
  }

  if (lead.status !== "NOVO") {
    eventos.push({
      id: `${lead.id}_ev3`,
      leadId: lead.id,
      tipo: "EMAIL",
      descricao: "E-mail de primeiro contato enviado.",
      autor: lead.consultor?.nome ?? "Sistema",
      metadata: { assunto: "Sobre sua solicitação", status: "enviado" },
      criadoEm: new Date(new Date(lead.createdAt).getTime() + 3600000).toISOString(),
    });
    eventos.push({
      id: `${lead.id}_ev4`,
      leadId: lead.id,
      tipo: "ATIVIDADE",
      descricao: "Ligação realizada. Cliente pediu proposta detalhada por escrito.",
      autor: lead.consultor?.nome ?? "Sistema",
      criadoEm: new Date(new Date(lead.createdAt).getTime() + 90000000).toISOString(),
    });
  }

  if (lead.valorEstimado) {
    eventos.push({
      id: `${lead.id}_ev5`,
      leadId: lead.id,
      tipo: "PROPOSTA",
      descricao: "Proposta comercial enviada ao cliente.",
      autor: lead.consultor?.nome ?? "Sistema",
      metadata: { valor: lead.valorEstimado },
      criadoEm: new Date(new Date(lead.createdAt).getTime() + 180000000).toISOString(),
    });
  }

  if (lead.status === "GANHOU" || lead.status === "PERDEU") {
    eventos.push({
      id: `${lead.id}_ev6`,
      leadId: lead.id,
      tipo: "FECHAMENTO",
      descricao:
        lead.status === "GANHOU"
          ? "Oportunidade fechada como ganha."
          : `Oportunidade perdida — ${lead.motivoPerda}.`,
      autor: lead.consultor?.nome ?? "Sistema",
      metadata: { resultado: lead.status },
      criadoEm: lead.ultimaMovimentacao,
    });
  }

  return eventos.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}

/* ── Templates ─────────────────────────────────────────────── */

export const templates: Template[] = [
  {
    id: "t_1",
    nome: "Primeiro contato",
    tipo: "EMAIL",
    assunto: "Olá {{nome}}, recebemos seu contato",
    corpo:
      "Olá {{nome}},\n\nObrigado pelo interesse na Vyra. Recebi sua mensagem e gostaria de entender melhor o cenário da {{empresa}} para preparar uma proposta adequada.\n\nVocê teria 20 minutos esta semana para uma conversa?\n\nAbraço,\n{{consultor}}",
    ativo: true,
    criadoEm: "2026-03-02T12:00:00Z",
  },
  {
    id: "t_2",
    nome: "Follow-up de proposta",
    tipo: "EMAIL",
    assunto: "{{nome}}, conseguiu avaliar a proposta?",
    corpo:
      "Olá {{nome}},\n\nPassando para saber se você conseguiu avaliar a proposta que enviei. Fico à disposição para ajustar o escopo ou esclarecer qualquer ponto.\n\nAbraço,\n{{consultor}}",
    ativo: true,
    criadoEm: "2026-03-06T12:00:00Z",
  },
  {
    id: "t_3",
    nome: "Reativação de lead frio",
    tipo: "EMAIL",
    assunto: "Ainda faz sentido conversarmos, {{nome}}?",
    corpo:
      "Olá {{nome}},\n\nNotei que nossa conversa parou por aqui. Se o momento não for adequado, sem problema — me diga e eu retomo mais para frente.\n\nAbraço,\n{{consultor}}",
    ativo: true,
    criadoEm: "2026-03-19T12:00:00Z",
  },
  {
    id: "t_4",
    nome: "WhatsApp — primeiro contato",
    tipo: "WHATSAPP",
    assunto: null,
    corpo:
      "Olá {{nome}}, aqui é {{consultor}} da Vyra. Recebi sua solicitação sobre {{assunto}}. Posso te ligar hoje à tarde?",
    ativo: true,
    criadoEm: "2026-04-01T12:00:00Z",
  },
  {
    id: "t_5",
    nome: "WhatsApp — lembrete de reunião",
    tipo: "WHATSAPP",
    assunto: null,
    corpo:
      "Oi {{nome}}! Passando para confirmar nossa reunião de {{data}} às {{hora}}. Confirma para mim?",
    ativo: true,
    criadoEm: "2026-04-08T12:00:00Z",
  },
  {
    id: "t_6",
    nome: "Agradecimento pós-fechamento",
    tipo: "EMAIL",
    assunto: "Bem-vindo à Vyra, {{nome}}!",
    corpo:
      "Olá {{nome}},\n\nQue alegria ter a {{empresa}} conosco. Nos próximos dias nosso time de implantação entrará em contato.\n\nAbraço,\n{{consultor}}",
    ativo: false,
    criadoEm: "2026-04-22T12:00:00Z",
  },
];

/* ── Métricas derivadas dos leads ──────────────────────────── */

export function calcularMetricas() {
  const total = leads.length;
  const novos = leads.filter((l) => l.status === "NOVO").length;
  const emAndamento = leads.filter((l) => l.status === "EM_ANDAMENTO").length;
  const ganhos = leads.filter((l) => l.status === "GANHOU").length;
  const perdidos = leads.filter((l) => l.status === "PERDEU").length;
  const fechados = ganhos + perdidos;

  const ociosos = leads.filter((l) => {
    if (l.status === "GANHOU" || l.status === "PERDEU") return false;
    return Date.now() - new Date(l.ultimaMovimentacao).getTime() > 3 * 86400000;
  }).length;

  const valorGanho = leads
    .filter((l) => l.status === "GANHOU")
    .reduce((sum, l) => sum + (l.valorEstimado ?? 0), 0);

  const valorEmAberto = leads
    .filter((l) => l.status === "NOVO" || l.status === "EM_ANDAMENTO" || l.status === "REPESCAGEM")
    .reduce((sum, l) => sum + (l.valorEstimado ?? 0), 0);

  return {
    totalLeads: total,
    leadsNovos: novos,
    emAndamento,
    ganhos,
    perdidos,
    ociosos,
    taxaConversao: fechados > 0 ? (ganhos / fechados) * 100 : 0,
    valorEmAberto,
    valorGanho,
    ticketMedio: ganhos > 0 ? valorGanho / ganhos : 0,
    variacao: {
      totalLeads: 12.4,
      taxaConversao: 3.8,
      valorGanho: 18.2,
      ticketMedio: -4.1,
    },
  };
}

export function calcularSerie(): SerieTemporal[] {
  const dias = 30;
  const serie: SerieTemporal[] = [];

  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(Date.now() - i * 86400000);
    const inicio = new Date(dia).setHours(0, 0, 0, 0);
    const fim = new Date(dia).setHours(23, 59, 59, 999);

    const noDia = (date: string) => {
      const t = new Date(date).getTime();
      return t >= inicio && t <= fim;
    };

    serie.push({
      data: dia.toISOString(),
      novos: leads.filter((l) => noDia(l.createdAt)).length,
      ganhos: leads.filter((l) => l.status === "GANHOU" && noDia(l.ultimaMovimentacao)).length,
      perdidos: leads.filter((l) => l.status === "PERDEU" && noDia(l.ultimaMovimentacao)).length,
    });
  }

  return serie;
}

export function calcularRanking(): RankingConsultor[] {
  return consultores
    .map((c) => {
      const meus = leads.filter((l) => l.consultorId === c.id);
      const ganhos = meus.filter((l) => l.status === "GANHOU");
      const fechados = meus.filter(
        (l) => l.status === "GANHOU" || l.status === "PERDEU",
      ).length;

      return {
        consultor: { id: c.id, nome: c.nome, email: c.email },
        leads: meus.length,
        ganhos: ganhos.length,
        taxaConversao: fechados > 0 ? (ganhos.length / fechados) * 100 : 0,
        valorGanho: ganhos.reduce((s, l) => s + (l.valorEstimado ?? 0), 0),
      };
    })
    .sort((a, b) => b.valorGanho - a.valorGanho);
}

export function calcularOrigens(): DistribuicaoOrigem[] {
  const mapa = new Map<string, number>();
  for (const lead of leads) {
    const origem = lead.origem ?? "desconhecida";
    mapa.set(origem, (mapa.get(origem) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([origem, total]) => ({ origem, total }))
    .sort((a, b) => b.total - a.total);
}

/** Rótulos legíveis para as origens técnicas vindas do webhook. */
export const rotuloOrigem: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  landing_page: "Landing page",
  indicacao: "Indicação",
  whatsapp: "WhatsApp",
  google_forms: "Google Forms",
  evento: "Evento",
  site_organico: "Site (orgânico)",
  desconhecida: "Desconhecida",
};
