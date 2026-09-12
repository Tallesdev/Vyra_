"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Columns3, Inbox } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/app-shell";
import { LeadCard } from "@/components/leads/lead-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formatBRL } from "@/lib/utils";
import type { Etapa, Lead } from "@/lib/types";

/* ── Coluna ────────────────────────────────────────────────── */

function Coluna({ etapa, leads }: { etapa: Etapa; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });

  const total = leads.reduce((s, l) => s + (l.valorEstimado ?? 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: etapa.cor }}
        />
        <h2 className="truncate text-sm font-medium">{etapa.nome}</h2>
        <Badge variant="muted" className="ml-auto shrink-0">
          {leads.length}
        </Badge>
      </div>

      <p className="text-muted-foreground mb-2 px-1 text-xs tabular-nums">
        {formatBRL(total)}
      </p>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-transparent bg-muted/40",
        )}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <p className="text-muted-foreground/60 px-2 py-8 text-center text-xs">
            Solte um lead aqui
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Página ────────────────────────────────────────────────── */

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [pipelineId, setPipelineId] = React.useState<string | null>(null);
  const [arrastando, setArrastando] = React.useState<Lead | null>(null);

  const pipelines = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => api.listarPipelines(),
  });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.listarLeads() });

  const pipeline =
    pipelines.data?.find((p) => p.id === pipelineId) ?? pipelines.data?.[0];

  const mover = useMutation({
    mutationFn: ({ id, etapaId }: { id: string; etapaId: string }) =>
      api.moverLead(id, etapaId),

    // Atualização otimista: o cartão muda de coluna antes da resposta.
    onMutate: async ({ id, etapaId }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const anterior = queryClient.getQueryData<Lead[]>(["leads"]);

      queryClient.setQueryData<Lead[]>(["leads"], (atual) =>
        atual?.map((l) =>
          l.id === id
            ? { ...l, etapaId, ultimaMovimentacao: new Date().toISOString() }
            : l,
        ),
      );

      return { anterior };
    },

    onError: (_erro, _vars, ctx) => {
      queryClient.setQueryData(["leads"], ctx?.anterior);
      toast.error("Não foi possível mover o lead.");
    },

    onSuccess: (lead) => {
      const etapa = pipeline?.etapas.find((e) => e.id === lead.etapaId);
      toast.success(`${lead.nome} movido para "${etapa?.nome}".`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["metricas"] });
      queryClient.invalidateQueries({ queryKey: ["ociosos"] });
    },
  });

  // 6px de tolerância evita que um clique no cartão vire arraste.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function aoIniciar(evento: DragStartEvent) {
    const lead = leads.data?.find((l) => l.id === evento.active.id);
    setArrastando(lead ?? null);
  }

  function aoFinalizar(evento: DragEndEvent) {
    setArrastando(null);
    const { active, over } = evento;
    if (!over) return;

    const lead = leads.data?.find((l) => l.id === active.id);
    if (!lead) return;

    // O alvo pode ser a coluna (droppable) ou outro cartão dentro dela.
    const alvo = over.id as string;
    const etapaAlvo =
      pipeline?.etapas.find((e) => e.id === alvo) ??
      pipeline?.etapas.find(
        (e) => e.id === leads.data?.find((l) => l.id === alvo)?.etapaId,
      );

    if (!etapaAlvo || etapaAlvo.id === lead.etapaId) return;
    mover.mutate({ id: lead.id, etapaId: etapaAlvo.id });
  }

  const carregando = pipelines.isPending || leads.isPending;

  const leadsDoPipeline =
    leads.data?.filter((l) => l.pipelineId === pipeline?.id) ?? [];

  const etapasOrdenadas =
    pipeline?.etapas.slice().sort((a, b) => a.ordem - b.ordem) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-6 p-6 pb-4">
        <PageHeader
          titulo="Funil de vendas"
          descricao="Arraste os cartões entre as etapas para atualizar o andamento."
          acoes={
            pipelines.data && pipelines.data.length > 1 ? (
              <Select
                value={pipeline?.id}
                onValueChange={(v) => setPipelineId(v)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecione o pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null
          }
        />
      </div>

      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {carregando ? (
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-72 shrink-0 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : !pipeline ? (
          <EmptyState
            icon={Columns3}
            titulo="Nenhum pipeline configurado"
            descricao="Crie um pipeline com suas etapas para começar a organizar o funil."
          />
        ) : leadsDoPipeline.length === 0 ? (
          <EmptyState
            icon={Inbox}
            titulo="Nenhum lead neste pipeline"
            descricao="Assim que os leads chegarem pelo webhook, eles aparecerão aqui."
          />
        ) : (
          <DndContext
            sensors={sensores}
            collisionDetection={closestCorners}
            onDragStart={aoIniciar}
            onDragEnd={aoFinalizar}
            onDragCancel={() => setArrastando(null)}
          >
            <div className="flex h-full gap-4">
              {etapasOrdenadas.map((etapa) => (
                <Coluna
                  key={etapa.id}
                  etapa={etapa}
                  leads={leadsDoPipeline.filter((l) => l.etapaId === etapa.id)}
                />
              ))}
            </div>

            {/* Cartão que segue o cursor durante o arraste */}
            <DragOverlay dropAnimation={{ duration: 180 }}>
              {arrastando && (
                <LeadCard
                  lead={arrastando}
                  arrastavel={false}
                  className="rotate-2 shadow-2xl"
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
