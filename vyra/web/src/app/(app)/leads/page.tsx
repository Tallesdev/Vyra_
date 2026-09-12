"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Users,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/layout/app-shell";
import {
  MarcadorBadge,
  SemCriterioBadge,
  StatusBadge,
} from "@/components/leads/lead-badges";
import { AvatarNome } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { rotuloOrigem } from "@/lib/mock-data";
import { cn, daysSince, formatBRL, formatPhone, timeAgo } from "@/lib/utils";
import type { Lead, LeadStatus, Marcador } from "@/lib/types";

type Ordenacao = "recentes" | "antigos" | "valor" | "parados";

const POR_PAGINA = 12;

export default function LeadsPage() {
  const [busca, setBusca] = React.useState("");
  const [status, setStatus] = React.useState<LeadStatus | "TODOS">("TODOS");
  const [marcador, setMarcador] = React.useState<Marcador | "TODOS">("TODOS");
  const [consultorId, setConsultorId] = React.useState<string>("TODOS");
  const [ordenacao, setOrdenacao] = React.useState<Ordenacao>("recentes");
  const [pagina, setPagina] = React.useState(1);

  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.listarLeads() });

  // Consultores presentes nos leads — evita listar quem não tem carteira.
  const consultores = React.useMemo(() => {
    const mapa = new Map<string, string>();
    leads.data?.forEach((l) => {
      if (l.consultor) mapa.set(l.consultor.id, l.consultor.nome);
    });
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [leads.data]);

  const filtrados = React.useMemo(() => {
    let resultado = leads.data ?? [];
    const q = busca.trim().toLowerCase();

    if (q) {
      resultado = resultado.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.telefone.includes(q.replace(/\D/g, "")) ||
          l.mensagem.toLowerCase().includes(q),
      );
    }
    if (status !== "TODOS") resultado = resultado.filter((l) => l.status === status);
    if (marcador !== "TODOS")
      resultado = resultado.filter((l) => l.marcador === marcador);
    if (consultorId !== "TODOS") {
      resultado =
        consultorId === "SEM"
          ? resultado.filter((l) => !l.consultorId)
          : resultado.filter((l) => l.consultorId === consultorId);
    }

    const ordenar: Record<Ordenacao, (a: Lead, b: Lead) => number> = {
      recentes: (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      antigos: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      valor: (a, b) => (b.valorEstimado ?? 0) - (a.valorEstimado ?? 0),
      parados: (a, b) =>
        new Date(a.ultimaMovimentacao).getTime() -
        new Date(b.ultimaMovimentacao).getTime(),
    };

    return [...resultado].sort(ordenar[ordenacao]);
  }, [leads.data, busca, status, marcador, consultorId, ordenacao]);

  // Qualquer mudança de filtro volta para a primeira página.
  React.useEffect(() => {
    setPagina(1);
  }, [busca, status, marcador, consultorId, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA,
  );

  const temFiltro =
    busca !== "" ||
    status !== "TODOS" ||
    marcador !== "TODOS" ||
    consultorId !== "TODOS";

  function limparFiltros() {
    setBusca("");
    setStatus("TODOS");
    setMarcador("TODOS");
    setConsultorId("TODOS");
  }

  const valorTotal = filtrados.reduce((s, l) => s + (l.valorEstimado ?? 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo="Leads"
        descricao={
          leads.data
            ? `${filtrados.length} de ${leads.data.length} leads · ${formatBRL(valorTotal)} em pipeline`
            : "Carregando..."
        }
      />

      {/* ── Filtros ───────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou mensagem..."
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as LeadStatus | "TODOS")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              <SelectItem value="NOVO">Novo</SelectItem>
              <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
              <SelectItem value="GANHOU">Ganhou</SelectItem>
              <SelectItem value="PERDEU">Perdeu</SelectItem>
              <SelectItem value="REPESCAGEM">Repescagem</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={marcador}
            onValueChange={(v) => setMarcador(v as Marcador | "TODOS")}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Temperatura</SelectItem>
              <SelectItem value="QUENTE">Quente</SelectItem>
              <SelectItem value="MORNO">Morno</SelectItem>
              <SelectItem value="FRIO">Frio</SelectItem>
            </SelectContent>
          </Select>

          <Select value={consultorId} onValueChange={setConsultorId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os consultores</SelectItem>
              <SelectItem value="SEM">Sem consultor</SelectItem>
              {consultores.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={ordenacao}
            onValueChange={(v) => setOrdenacao(v as Ordenacao)}
          >
            <SelectTrigger className="w-44">
              <ArrowUpDown className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
              <SelectItem value="valor">Maior valor</SelectItem>
              <SelectItem value="parados">Parados há mais tempo</SelectItem>
            </SelectContent>
          </Select>

          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="size-4" />
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* ── Tabela ────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {leads.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={temFiltro ? Filter : Users}
            titulo={
              temFiltro ? "Nenhum lead corresponde aos filtros" : "Nenhum lead ainda"
            }
            descricao={
              temFiltro
                ? "Ajuste ou limpe os filtros para ver mais resultados."
                : "Os leads aparecem aqui assim que chegam pelo webhook."
            }
            acao={
              temFiltro && (
                <Button variant="outline" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="pr-5 text-right">Parado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((lead) => {
                  const parado = daysSince(lead.ultimaMovimentacao);
                  const ocioso =
                    parado >= 3 &&
                    lead.status !== "GANHOU" &&
                    lead.status !== "PERDEU";

                  return (
                    <TableRow key={lead.id} className="group">
                      <TableCell className="pl-5">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="flex items-center gap-3"
                        >
                          <AvatarNome nome={lead.nome} className="size-8" />
                          <div className="min-w-0">
                            <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                              {lead.nome}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {lead.email ?? formatPhone(lead.telefone)}
                            </p>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={lead.status} />
                          {lead.semCriterio && <SemCriterioBadge />}
                        </div>
                      </TableCell>

                      <TableCell>
                        <MarcadorBadge marcador={lead.marcador} showLabel={false} />
                      </TableCell>

                      <TableCell>
                        {lead.consultor ? (
                          <div className="flex items-center gap-2">
                            <AvatarNome
                              nome={lead.consultor.nome}
                              className="size-6"
                            />
                            <span className="truncate text-sm">
                              {lead.consultor.nome}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="muted">
                          {rotuloOrigem[lead.origem ?? "desconhecida"] ??
                            lead.origem}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatBRL(lead.valorEstimado)}
                      </TableCell>

                      <TableCell className="pr-5 text-right">
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            ocioso
                              ? "text-warning font-medium"
                              : "text-muted-foreground",
                          )}
                          title={timeAgo(lead.ultimaMovimentacao)}
                        >
                          {lead.status === "GANHOU" || lead.status === "PERDEU"
                            ? "—"
                            : `${parado}d`}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* ── Paginação ─────────────────────────────── */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t px-5 py-3">
                <p className="text-muted-foreground text-sm">
                  Página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual === 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
