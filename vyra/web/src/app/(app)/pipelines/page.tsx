"use client";

import { useQuery } from "@tanstack/react-query";
import { GitBranch, Lock } from "lucide-react";

import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";

export default function PipelinesPage() {
  const pipelines = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => api.listarPipelines(),
  });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.listarLeads() });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo="Pipelines"
        descricao="Etapas que compõem cada funil de vendas da operação."
      />

      {pipelines.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : (pipelines.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={GitBranch}
            titulo="Nenhum pipeline configurado"
            descricao="Crie um pipeline para organizar as etapas do seu funil de vendas."
          />
        </Card>
      ) : (
        pipelines.data!.map((pipeline) => {
          const doPipeline =
            leads.data?.filter((l) => l.pipelineId === pipeline.id) ?? [];
          const etapas = pipeline.etapas.slice().sort((a, b) => a.ordem - b.ordem);

          return (
            <Card key={pipeline.id}>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {pipeline.nome}
                    {!pipeline.ativo && <Badge variant="muted">Inativo</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {etapas.length} etapas · {doPipeline.length} leads
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {/* Trilha visual do funil */}
                <div className="flex flex-wrap gap-2">
                  {etapas.map((etapa) => {
                    const naEtapa = doPipeline.filter(
                      (l) => l.etapaId === etapa.id,
                    );
                    const valor = naEtapa.reduce(
                      (s, l) => s + (l.valorEstimado ?? 0),
                      0,
                    );

                    return (
                      <div
                        key={etapa.id}
                        className="min-w-40 flex-1 rounded-lg border p-3"
                        style={{ borderTopColor: etapa.cor, borderTopWidth: 3 }}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">
                            {etapa.nome}
                          </p>
                          {etapa.obrigatoria && (
                            <Lock
                              className="text-muted-foreground size-3 shrink-0"
                              aria-label="Etapa obrigatória"
                            />
                          )}
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums">
                          {naEtapa.length}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatBRL(valor)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
                  <Lock className="size-3" />
                  As etapas “Ganhou” e “Perdeu” são obrigatórias e não podem ser
                  removidas — elas sincronizam o status do lead automaticamente.
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
