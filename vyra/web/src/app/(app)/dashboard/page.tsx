"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  Crown,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  GraficoFunil,
  GraficoOrigens,
  GraficoSerie,
} from "@/components/dashboard/charts";
import { MarcadorBadge, StatusBadge } from "@/components/leads/lead-badges";
import { AvatarNome } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  formatBRL,
  formatDate,
  formatNumber,
  formatPercent,
  timeAgo,
} from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  const metricas = useQuery({
    queryKey: ["metricas"],
    queryFn: () => api.obterMetricas(),
  });
  const serie = useQuery({ queryKey: ["serie"], queryFn: () => api.obterSerie() });
  const ranking = useQuery({
    queryKey: ["ranking"],
    queryFn: () => api.obterRanking(),
  });
  const origens = useQuery({
    queryKey: ["origens"],
    queryFn: () => api.obterOrigens(),
  });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.listarLeads() });
  const pipelines = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => api.listarPipelines(),
  });

  const m = metricas.data;

  // Distribuição por etapa aberta do pipeline principal.
  const funil = (() => {
    const pipeline = pipelines.data?.[0];
    if (!pipeline || !leads.data) return [];
    return pipeline.etapas
      .filter((e) => !e.obrigatoria)
      .sort((a, b) => a.ordem - b.ordem)
      .map((etapa) => ({
        etapa: etapa.nome,
        total: leads.data.filter((l) => l.etapaId === etapa.id).length,
        cor: etapa.cor,
      }));
  })();

  const recentes = leads.data?.slice(0, 6) ?? [];
  const topRanking = ranking.data?.slice(0, 5) ?? [];
  const maiorValor = topRanking[0]?.valorGanho ?? 1;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo={`Olá, ${primeiroNome}`}
        descricao="Visão geral da operação comercial nos últimos 30 dias."
        acoes={
          <Button asChild variant="outline">
            <Link href="/kanban">
              Abrir funil <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {/* ── Indicadores ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Total de leads"
          valor={m ? formatNumber(m.totalLeads) : "—"}
          variacao={m?.variacao.totalLeads}
          icone={Users}
          tom="brand"
          rodape="vs. período anterior"
          carregando={metricas.isPending}
        />
        <StatCard
          rotulo="Taxa de conversão"
          valor={m ? formatPercent(m.taxaConversao) : "—"}
          variacao={m?.variacao.taxaConversao}
          icone={Target}
          tom="success"
          rodape={m ? `${m.ganhos} de ${m.ganhos + m.perdidos} fechados` : undefined}
          carregando={metricas.isPending}
        />
        <StatCard
          rotulo="Receita ganha"
          valor={m ? formatBRL(m.valorGanho) : "—"}
          variacao={m?.variacao.valorGanho}
          icone={Wallet}
          tom="info"
          rodape={m ? `${formatBRL(m.valorEmAberto)} em aberto` : undefined}
          carregando={metricas.isPending}
        />
        <StatCard
          rotulo="Ticket médio"
          valor={m ? formatBRL(m.ticketMedio) : "—"}
          variacao={m?.variacao.ticketMedio}
          icone={TrendingUp}
          tom="warning"
          rodape="por oportunidade ganha"
          carregando={metricas.isPending}
        />
      </div>

      {/* ── Alerta de ociosidade ──────────────────────────── */}
      {m && m.ociosos > 0 && (
        <Card className="border-warning/30 bg-warning/[0.06]">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="bg-warning/15 text-warning grid size-10 shrink-0 place-items-center rounded-lg">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {m.ociosos} {m.ociosos === 1 ? "lead parado" : "leads parados"} há
                mais de 3 dias
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Oportunidades sem movimentação tendem a esfriar. Vale uma
                retomada.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/ociosos">Revisar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Série temporal + origens ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Evolução do funil</CardTitle>
              <CardDescription>
                Leads recebidos, ganhos e perdidos por dia.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {serie.isPending ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <GraficoSerie dados={serie.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Origem dos leads</CardTitle>
              <CardDescription>Canais de aquisição.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {origens.isPending ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <GraficoOrigens dados={origens.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Funil por etapa + ranking ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Leads por etapa</CardTitle>
              <CardDescription>
                Distribuição atual no pipeline comercial.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {pipelines.isPending || leads.isPending ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <GraficoFunil dados={funil} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ranking de consultores</CardTitle>
              <CardDescription>Por receita ganha no período.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ranking.isPending
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))
              : topRanking.map((r, i) => (
                  <div key={r.consultor.id} className="flex items-center gap-3">
                    <div className="relative">
                      <AvatarNome nome={r.consultor.nome} />
                      {i === 0 && (
                        <span className="bg-warning text-warning-foreground absolute -top-1 -right-1 grid size-4 place-items-center rounded-full">
                          <Crown className="size-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {r.consultor.nome}
                        </p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatBRL(r.valorGanho)}
                        </span>
                      </div>
                      <Progress
                        value={(r.valorGanho / maiorValor) * 100}
                        className="mt-2 h-1.5"
                      />
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {r.ganhos} de {r.leads} leads ·{" "}
                        {formatPercent(r.taxaConversao, 0)} de conversão
                      </p>
                    </div>
                  </div>
                ))}

            {!ranking.isPending && topRanking.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Ainda não há dados de conversão.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Leads recentes ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Leads recentes</CardTitle>
            <CardDescription>Os últimos contatos que chegaram.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/leads">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {leads.isPending ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {recentes.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="hover:bg-muted/40 flex items-center gap-3 px-5 py-3 transition-colors"
                  >
                    <AvatarNome nome={lead.nome} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.nome}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {lead.consultor
                          ? `Atribuído a ${lead.consultor.nome}`
                          : "Aguardando atribuição"}{" "}
                        · {timeAgo(lead.createdAt)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <MarcadorBadge marcador={lead.marcador} showLabel={false} />
                      <StatusBadge status={lead.status} />
                    </div>
                    <span className="hidden w-24 shrink-0 text-right text-sm font-medium tabular-nums md:block">
                      {formatBRL(lead.valorEstimado)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Resumo de status ──────────────────────────────── */}
      {m && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { rotulo: "Novos", valor: m.leadsNovos, variant: "brand" as const },
            {
              rotulo: "Em andamento",
              valor: m.emAndamento,
              variant: "info" as const,
            },
            { rotulo: "Ganhos", valor: m.ganhos, variant: "success" as const },
            {
              rotulo: "Perdidos",
              valor: m.perdidos,
              variant: "destructive" as const,
            },
          ].map((s) => (
            <Card key={s.rotulo} className="flex-row items-center gap-4 p-5">
              <Trophy className="text-muted-foreground/40 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tabular-nums">
                  {formatNumber(s.valor)}
                </p>
                <p className="text-muted-foreground text-xs">{s.rotulo}</p>
              </div>
              <Badge variant={s.variant}>
                {formatPercent((s.valor / m.totalLeads) * 100, 0)}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-center text-xs">
        Dados atualizados em {formatDate(new Date())}.
      </p>
    </div>
  );
}
