/**
 * Espelha os modelos do Prisma e os contratos das rotas da API Vyra.
 * Fonte: vyra/api/prisma/schema.prisma e vyra/api/src/modules/**\/*.schema.js
 */

export type Role = "ADMIN" | "GERENTE" | "CONSULTOR";

export type LeadStatus =
  | "NOVO"
  | "EM_ANDAMENTO"
  | "GANHOU"
  | "PERDEU"
  | "REPESCAGEM";

export type Marcador = "FRIO" | "MORNO" | "QUENTE";

export type TipoTemplate = "EMAIL" | "WHATSAPP";

export type TipoAtividade = "ATIVIDADE" | "NOTA" | "PROPOSTA";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  gerenteId: string | null;
  perfilDescricao?: string | null;
  /** Vetor de embedding usado na atribuição semântica. */
  vetorPerfil?: number[];
  createdAt: string;
}

export interface ConsultorResumo {
  id: string;
  nome: string;
  email: string;
}

export interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  /** "Ganhou" e "Perdeu" são criadas automaticamente e não podem ser removidas. */
  obrigatoria: boolean;
  pipelineId: string;
}

export interface Pipeline {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  etapas: Etapa[];
}

export interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string;
  mensagem: string;
  origem: string | null;
  status: LeadStatus;
  marcador: Marcador;
  semCriterio: boolean;
  consultorId: string | null;
  consultor: ConsultorResumo | null;
  pipelineId: string | null;
  etapaId: string | null;
  valorEstimado: number | null;
  motivoPerda: string | null;
  ultimaMovimentacao: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timeline guardada no MongoDB (api/src/modules/crm/crm.timeline.js).
 *
 * Os 8 primeiros tipos existem no enum do Mongo. ATRIBUICAO e REATRIBUICAO
 * são usados apenas pelo modo mock — a API real registra esses eventos como
 * ATIVIDADE. O componente Timeline tem fallback para tipos desconhecidos.
 *
 * A API entrega `usuarioNome` e `createdAt`; a conversão para `autor` e
 * `criadoEm` acontece em normalizarEvento (lib/api.ts).
 */
export interface EventoTimeline {
  id: string;
  leadId: string;
  tipo:
    | "CRIACAO"
    | "MOVIMENTACAO"
    | "EMAIL"
    | "WHATSAPP"
    | "ATIVIDADE"
    | "PROPOSTA"
    | "FECHAMENTO"
    | "NOTA"
    | "ATRIBUICAO"
    | "REATRIBUICAO";
  descricao: string;
  autor: string;
  metadata?: Record<string, unknown>;
  criadoEm: string;
}

export interface Template {
  id: string;
  nome: string;
  tipo: TipoTemplate;
  assunto: string | null;
  corpo: string;
  ativo: boolean;
  criadoEm: string;
}

/* ── Respostas de autenticação ─────────────────────────────── */

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: Pick<Usuario, "id" | "nome" | "email" | "role">;
}

/* ── Payloads de escrita ───────────────────────────────────── */

export interface AtualizarLeadInput {
  nome?: string;
  email?: string;
  telefone?: string;
  marcador?: Marcador;
  valorEstimado?: number;
}

export interface FecharOportunidadeInput {
  resultado: "GANHOU" | "PERDEU";
  motivoPerda?: string;
  valorFinal?: number;
}

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: Role;
  gerenteId?: string;
  perfilDescricao?: string;
}

/* ── Métricas do dashboard ─────────────────────────────────── */

export interface DashboardMetricas {
  totalLeads: number;
  leadsNovos: number;
  emAndamento: number;
  ganhos: number;
  perdidos: number;
  ociosos: number;
  taxaConversao: number;
  valorEmAberto: number;
  valorGanho: number;
  ticketMedio: number;
  /** Variação percentual contra o período anterior. */
  variacao: {
    totalLeads: number;
    taxaConversao: number;
    valorGanho: number;
    ticketMedio: number;
  };
}

export interface SerieTemporal {
  data: string;
  novos: number;
  ganhos: number;
  perdidos: number;
}

export interface RankingConsultor {
  consultor: ConsultorResumo;
  leads: number;
  ganhos: number;
  taxaConversao: number;
  valorGanho: number;
}

export interface DistribuicaoOrigem {
  origem: string;
  total: number;
}
