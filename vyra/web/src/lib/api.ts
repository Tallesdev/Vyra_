/**
 * Camada única de acesso a dados.
 *
 * Em modo mock (padrão) opera sobre um store em memória, permitindo
 * desenvolver o front inteiro sem API, banco ou Docker. Em modo real
 * fala com a API Fastify usando o access token guardado no auth store.
 *
 * Alterne pelo .env.local:
 *   NEXT_PUBLIC_USE_MOCK=false
 *   NEXT_PUBLIC_API_URL=http://localhost:3000
 */

import * as mock from "./mock-data";
import type {
  AtualizarLeadInput,
  CriarUsuarioInput,
  DashboardMetricas,
  DistribuicaoOrigem,
  EventoTimeline,
  FecharOportunidadeInput,
  Lead,
  LoginResponse,
  Pipeline,
  RankingConsultor,
  SerieTemporal,
  Template,
  TipoAtividade,
  Usuario,
} from "./types";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/* ── Erro tipado ───────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ── Store em memória (modo mock) ──────────────────────────── */

const store = {
  leads: [...mock.leads],
  usuarios: [...mock.usuarios],
  pipelines: [...mock.pipelines],
  templates: [...mock.templates],
  /** Eventos adicionados durante a sessão, por lead. */
  eventosExtras: new Map<string, EventoTimeline[]>(),
};

/** Latência artificial — deixa os estados de carregamento visíveis no dev. */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

function novoId(prefixo: string) {
  return `${prefixo}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ── Transporte HTTP (modo real) ───────────────────────────── */

let tokenGetter: () => string | null = () => null;
let aoExpirar: (() => Promise<boolean>) | null = null;

/** O auth store registra aqui como obter o access token vigente. */
export function registrarTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

/**
 * O auth store registra aqui como renovar a sessão.
 * Deve devolver true se conseguiu um novo access token.
 */
export function registrarRenovacao(fn: () => Promise<boolean>) {
  aoExpirar = fn;
}

/** Evita que várias requisições simultâneas disparem N refreshes. */
let renovacaoEmCurso: Promise<boolean> | null = null;

function renovarUmaVez() {
  if (!aoExpirar) return Promise.resolve(false);
  renovacaoEmCurso ??= aoExpirar().finally(() => {
    renovacaoEmCurso = null;
  });
  return renovacaoEmCurso;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  jaRenovou = false,
): Promise<T> {
  const token = tokenGetter();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  // O access token dura 15 min. Ao expirar, renova uma vez e repete a
  // requisição — sem isso o usuário cairia para o login no meio do uso.
  if (res.status === 401 && !jaRenovou && aoExpirar) {
    const renovou = await renovarUmaVez();
    if (renovou) return request<T>(path, init, true);
  }

  if (!res.ok) {
    let mensagem = `Erro ${res.status}`;
    try {
      const corpo = await res.json();
      mensagem = corpo.message ?? mensagem;
    } catch {
      /* resposta sem corpo JSON */
    }
    throw new ApiError(mensagem, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ── Normalização das respostas da API ─────────────────────── */

/**
 * `valorEstimado` é Decimal(12,2) no Prisma e chega como string no JSON.
 * Sem converter, toda soma vira concatenação de texto.
 */
function normalizarLead(bruto: Record<string, unknown>): Lead {
  const valor = bruto.valorEstimado;
  return {
    ...(bruto as unknown as Lead),
    valorEstimado: valor === null || valor === undefined ? null : Number(valor),
  };
}

/**
 * O Mongo grava `usuarioNome` e `createdAt` (crm.timeline.js), enquanto o
 * front trabalha com `autor` e `criadoEm`.
 */
function normalizarEvento(bruto: Record<string, unknown>): EventoTimeline {
  return {
    id: String(bruto._id ?? bruto.id ?? ""),
    leadId: String(bruto.leadId ?? ""),
    tipo: bruto.tipo as EventoTimeline["tipo"],
    descricao: String(bruto.descricao ?? ""),
    autor: String(bruto.usuarioNome ?? bruto.autor ?? "Sistema"),
    metadata: bruto.metadata as Record<string, unknown> | undefined,
    criadoEm: String(bruto.createdAt ?? bruto.criadoEm ?? ""),
  };
}

/* ── API pública ───────────────────────────────────────────── */

export const api = {
  /* Autenticação ------------------------------------------- */

  async login(email: string, senha: string): Promise<LoginResponse> {
    if (USE_MOCK) {
      await delay(600);
      const usuario = store.usuarios.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim(),
      );
      // No mock qualquer senha com 6+ caracteres é aceita.
      if (!usuario || senha.length < 6) {
        throw new ApiError("E-mail ou senha inválidos", 401);
      }
      if (!usuario.ativo) {
        throw new ApiError("Usuário desativado", 403);
      }
      return {
        accessToken: `mock.${usuario.id}.token`,
        refreshToken: `mock.${usuario.id}.refresh`,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
        },
      };
    }

    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
  },

  /** Troca o refresh token por um novo access token. */
  async renovarToken(refreshToken: string): Promise<{ accessToken: string }> {
    if (USE_MOCK) {
      await delay(150);
      return { accessToken: refreshToken.replace(".refresh", ".token") };
    }
    return request<{ accessToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  async recuperarSenha(email: string): Promise<{ message: string }> {
    if (USE_MOCK) {
      await delay(700);
      return {
        message: "Se o e-mail existir, enviaremos as instruções de recuperação.",
      };
    }
    return request("/api/auth/recuperar-senha", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async logout(refreshToken: string): Promise<void> {
    if (USE_MOCK) {
      await delay(120);
      return;
    }
    await request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  /* Leads --------------------------------------------------- */

  async listarLeads(): Promise<Lead[]> {
    if (USE_MOCK) {
      await delay();
      return [...store.leads];
    }
    const dados = await request<Record<string, unknown>[]>("/api/leads");
    return dados.map(normalizarLead);
  },

  async obterLead(id: string): Promise<Lead> {
    if (USE_MOCK) {
      await delay(200);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);
      return lead;
    }
    return normalizarLead(await request<Record<string, unknown>>(`/api/crm/${id}`));
  },

  async listarOciosos(): Promise<Lead[]> {
    if (USE_MOCK) {
      await delay();
      const limite = Date.now() - 3 * 86400000;
      return store.leads.filter(
        (l) =>
          l.status !== "GANHOU" &&
          l.status !== "PERDEU" &&
          new Date(l.ultimaMovimentacao).getTime() < limite,
      );
    }
    const dados = await request<Record<string, unknown>[]>("/api/leads/ociosos");
    return dados.map(normalizarLead);
  },

  async moverLead(id: string, etapaId: string): Promise<Lead> {
    if (USE_MOCK) {
      await delay(180);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);

      const pipeline = store.pipelines.find((p) => p.id === lead.pipelineId);
      const etapa = pipeline?.etapas.find((e) => e.id === etapaId);
      if (!etapa) throw new ApiError("Etapa não encontrada", 404);

      lead.etapaId = etapaId;
      lead.ultimaMovimentacao = new Date().toISOString();

      // Etapas obrigatórias sincronizam o status do lead.
      if (etapa.nome === "Ganhou") lead.status = "GANHOU";
      else if (etapa.nome === "Perdeu") lead.status = "PERDEU";
      else if (lead.status === "NOVO") lead.status = "EM_ANDAMENTO";

      registrarEvento(lead.id, {
        tipo: "MOVIMENTACAO",
        descricao: `Lead movido para "${etapa.nome}".`,
      });

      return lead;
    }
    return normalizarLead(
      await request<Record<string, unknown>>(`/api/leads/${id}/mover`, {
        method: "PATCH",
        body: JSON.stringify({ etapaId }),
      }),
    );
  },

  async atualizarLead(id: string, dados: AtualizarLeadInput): Promise<Lead> {
    if (USE_MOCK) {
      await delay(220);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);
      Object.assign(lead, dados, { updatedAt: new Date().toISOString() });
      registrarEvento(lead.id, {
        tipo: "ATIVIDADE",
        descricao: "Dados do lead atualizados.",
      });
      return lead;
    }
    return normalizarLead(
      await request<Record<string, unknown>>(`/api/crm/${id}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
    );
  },

  async reatribuirLead(id: string, consultorId: string): Promise<Lead> {
    if (USE_MOCK) {
      await delay(240);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);
      const consultor = store.usuarios.find((u) => u.id === consultorId);
      if (!consultor) throw new ApiError("Consultor não encontrado", 404);

      const anterior = lead.consultor?.nome ?? "ninguém";
      lead.consultorId = consultor.id;
      lead.consultor = {
        id: consultor.id,
        nome: consultor.nome,
        email: consultor.email,
      };
      lead.semCriterio = false;

      registrarEvento(lead.id, {
        tipo: "REATRIBUICAO",
        descricao: `Lead reatribuído de ${anterior} para ${consultor.nome}.`,
      });

      return lead;
    }
    return normalizarLead(
      await request<Record<string, unknown>>(`/api/crm/${id}/reatribuir`, {
        method: "PATCH",
        body: JSON.stringify({ consultorId }),
      }),
    );
  },

  async fecharOportunidade(
    id: string,
    dados: FecharOportunidadeInput,
  ): Promise<Lead> {
    if (USE_MOCK) {
      await delay(300);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);

      lead.status = dados.resultado;
      lead.etapaId = dados.resultado === "GANHOU" ? "e_ganhou" : "e_perdeu";
      lead.motivoPerda = dados.motivoPerda ?? null;
      if (dados.valorFinal !== undefined) lead.valorEstimado = dados.valorFinal;
      lead.ultimaMovimentacao = new Date().toISOString();

      registrarEvento(lead.id, {
        tipo: "FECHAMENTO",
        descricao:
          dados.resultado === "GANHOU"
            ? "Oportunidade fechada como ganha."
            : `Oportunidade perdida — ${dados.motivoPerda ?? "sem motivo informado"}.`,
      });

      return lead;
    }
    return normalizarLead(
      await request<Record<string, unknown>>(`/api/crm/${id}/fechar`, {
        method: "PATCH",
        body: JSON.stringify(dados),
      }),
    );
  },

  async adicionarAtividade(
    id: string,
    descricao: string,
    tipo: TipoAtividade = "ATIVIDADE",
  ): Promise<EventoTimeline> {
    if (USE_MOCK) {
      await delay(200);
      return registrarEvento(id, { tipo, descricao });
    }
    return normalizarEvento(
      await request<Record<string, unknown>>(`/api/crm/${id}/atividades`, {
        method: "POST",
        body: JSON.stringify({ descricao, tipo }),
      }),
    );
  },

  async obterTimeline(id: string): Promise<EventoTimeline[]> {
    if (USE_MOCK) {
      await delay(200);
      const lead = store.leads.find((l) => l.id === id);
      if (!lead) throw new ApiError("Lead não encontrado", 404);
      const extras = store.eventosExtras.get(id) ?? [];
      return [...extras, ...mock.buildTimeline(lead)].sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
      );
    }
    // A timeline vem embutida no perfil do lead (crm.service.perfilLead).
    const perfil = await request<{ timeline?: Record<string, unknown>[] }>(
      `/api/crm/${id}`,
    );
    return (perfil.timeline ?? []).map(normalizarEvento);
  },

  /* Pipelines ----------------------------------------------- */

  async listarPipelines(): Promise<Pipeline[]> {
    if (USE_MOCK) {
      await delay();
      return [...store.pipelines];
    }
    return request<Pipeline[]>("/api/pipelines");
  },

  /* Usuários ------------------------------------------------ */

  async listarUsuarios(): Promise<Usuario[]> {
    if (USE_MOCK) {
      await delay();
      return [...store.usuarios];
    }
    return request<Usuario[]>("/api/users");
  },

  async criarUsuario(dados: CriarUsuarioInput): Promise<Usuario> {
    if (USE_MOCK) {
      await delay(400);
      if (store.usuarios.some((u) => u.email === dados.email)) {
        throw new ApiError("Já existe um usuário com este e-mail", 409);
      }
      const usuario: Usuario = {
        id: novoId("u"),
        nome: dados.nome,
        email: dados.email,
        role: dados.role,
        ativo: true,
        gerenteId: dados.gerenteId ?? null,
        perfilDescricao: dados.perfilDescricao ?? null,
        createdAt: new Date().toISOString(),
      };
      store.usuarios.push(usuario);
      return usuario;
    }
    return request<Usuario>("/api/users", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  },

  async desativarUsuario(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay(240);
      const usuario = store.usuarios.find((u) => u.id === id);
      if (usuario) usuario.ativo = false;
      return;
    }
    await request(`/api/users/${id}`, { method: "DELETE" });
  },

  async atualizarPerfilIA(id: string, descricao: string): Promise<Usuario> {
    if (USE_MOCK) {
      await delay(700); // gerar embedding é lento de verdade
      const usuario = store.usuarios.find((u) => u.id === id);
      if (!usuario) throw new ApiError("Usuário não encontrado", 404);
      usuario.perfilDescricao = descricao;
      return usuario;
    }
    return request<Usuario>(`/api/users/${id}/perfil-ia`, {
      method: "PATCH",
      body: JSON.stringify({ descricao }),
    });
  },

  /* Templates ----------------------------------------------- */

  async listarTemplates(): Promise<Template[]> {
    if (USE_MOCK) {
      await delay();
      return [...store.templates];
    }
    return request<Template[]>("/api/comms/templates");
  },

  async criarTemplate(
    dados: Omit<Template, "id" | "criadoEm" | "ativo">,
  ): Promise<Template> {
    if (USE_MOCK) {
      await delay(320);
      const template: Template = {
        ...dados,
        id: novoId("t"),
        ativo: true,
        criadoEm: new Date().toISOString(),
      };
      store.templates.push(template);
      return template;
    }
    return request<Template>("/api/comms/templates", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  },

  async enviarEmail(
    leadId: string,
    assunto: string,
    corpo: string,
  ): Promise<void> {
    if (USE_MOCK) {
      await delay(800);
      registrarEvento(leadId, {
        tipo: "EMAIL",
        descricao: `E-mail enviado: "${assunto}".`,
        metadata: { assunto, corpo, status: "enviado" },
      });
      return;
    }
    await request("/api/comms/email/enviar", {
      method: "POST",
      body: JSON.stringify({ leadId, assunto, corpo }),
    });
  },

  async registrarWhatsapp(leadId: string, mensagem: string): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      registrarEvento(leadId, {
        tipo: "WHATSAPP",
        descricao: "Mensagem de WhatsApp registrada.",
        metadata: { mensagem },
      });
      return;
    }
    await request("/api/comms/whatsapp/registrar", {
      method: "POST",
      body: JSON.stringify({ leadId, mensagemEnviada: mensagem }),
    });
  },

  /* Dashboard ----------------------------------------------- */

  async obterMetricas(): Promise<DashboardMetricas> {
    if (USE_MOCK) {
      await delay(300);
      return recalcularMetricas();
    }
    return request<DashboardMetricas>("/api/logs/dashboard");
  },

  async obterSerie(): Promise<SerieTemporal[]> {
    if (USE_MOCK) {
      await delay(320);
      return mock.calcularSerie();
    }
    return request<SerieTemporal[]>("/api/logs/serie");
  },

  async obterRanking(): Promise<RankingConsultor[]> {
    if (USE_MOCK) {
      await delay(300);
      return mock.calcularRanking();
    }
    return request<RankingConsultor[]>("/api/logs/ranking");
  },

  async obterOrigens(): Promise<DistribuicaoOrigem[]> {
    if (USE_MOCK) {
      await delay(280);
      return mock.calcularOrigens();
    }
    return request<DistribuicaoOrigem[]>("/api/logs/origens");
  },
};

/* ── Auxiliares do modo mock ───────────────────────────────── */

function registrarEvento(
  leadId: string,
  dados: Pick<EventoTimeline, "tipo" | "descricao"> &
    Partial<Pick<EventoTimeline, "metadata" | "autor">>,
): EventoTimeline {
  const evento: EventoTimeline = {
    id: novoId("ev"),
    leadId,
    autor: dados.autor ?? "Você",
    criadoEm: new Date().toISOString(),
    ...dados,
  };
  const atuais = store.eventosExtras.get(leadId) ?? [];
  store.eventosExtras.set(leadId, [evento, ...atuais]);
  return evento;
}

/** Recalcula as métricas sobre o store vivo, não sobre o snapshot inicial. */
function recalcularMetricas(): DashboardMetricas {
  const leads = store.leads;
  const total = leads.length;
  const ganhos = leads.filter((l) => l.status === "GANHOU");
  const perdidos = leads.filter((l) => l.status === "PERDEU");
  const fechados = ganhos.length + perdidos.length;

  const valorGanho = ganhos.reduce((s, l) => s + (l.valorEstimado ?? 0), 0);
  const valorEmAberto = leads
    .filter((l) => !["GANHOU", "PERDEU"].includes(l.status))
    .reduce((s, l) => s + (l.valorEstimado ?? 0), 0);

  const limite = Date.now() - 3 * 86400000;

  return {
    totalLeads: total,
    leadsNovos: leads.filter((l) => l.status === "NOVO").length,
    emAndamento: leads.filter((l) => l.status === "EM_ANDAMENTO").length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    ociosos: leads.filter(
      (l) =>
        !["GANHOU", "PERDEU"].includes(l.status) &&
        new Date(l.ultimaMovimentacao).getTime() < limite,
    ).length,
    taxaConversao: fechados > 0 ? (ganhos.length / fechados) * 100 : 0,
    valorEmAberto,
    valorGanho,
    ticketMedio: ganhos.length > 0 ? valorGanho / ganhos.length : 0,
    variacao: {
      totalLeads: 12.4,
      taxaConversao: 3.8,
      valorGanho: 18.2,
      ticketMedio: -4.1,
    },
  };
}
