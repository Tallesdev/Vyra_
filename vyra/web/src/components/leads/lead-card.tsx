"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical } from "lucide-react";

import { AvatarNome } from "@/components/ui/avatar";
import { MarcadorBadge, SemCriterioBadge } from "./lead-badges";
import { cn, daysSince, formatBRL, timeAgo } from "@/lib/utils";
import type { Lead } from "@/lib/types";

/** Cartão do lead no funil. `arrastavel` desliga o dnd na sobreposição. */
export function LeadCard({
  lead,
  arrastavel = true,
  className,
}: {
  lead: Lead;
  arrastavel?: boolean;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, disabled: !arrastavel });

  const parado = daysSince(lead.ultimaMovimentacao);
  const ocioso =
    parado >= 3 && lead.status !== "GANHOU" && lead.status !== "PERDEU";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "bg-card group rounded-lg border p-3 shadow-sm transition-shadow",
        isDragging && "opacity-40",
        !isDragging && "hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {arrastavel && (
          <button
            {...attributes}
            {...listeners}
            aria-label={`Mover ${lead.nome}`}
            className="text-muted-foreground/40 hover:text-muted-foreground -ml-1 cursor-grab touch-none rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            className="hover:text-primary block truncate text-sm font-medium transition-colors"
          >
            {lead.nome}
          </Link>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug">
            {lead.mensagem}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <MarcadorBadge marcador={lead.marcador} showLabel={false} />
        {lead.semCriterio && <SemCriterioBadge />}
        {ocioso && (
          <span
            className="text-warning inline-flex items-center gap-1 text-[11px] font-medium"
            title={`Sem movimentação há ${parado} dias`}
          >
            <Clock className="size-3" />
            {parado}d
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
        {lead.consultor ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <AvatarNome nome={lead.consultor.nome} className="size-5" />
            <span className="text-muted-foreground truncate text-[11px]">
              {lead.consultor.nome.split(" ")[0]}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">Sem consultor</span>
        )}

        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {formatBRL(lead.valorEstimado)}
        </span>
      </div>

      <p className="text-muted-foreground/70 mt-1.5 text-[10px]">
        {timeAgo(lead.createdAt)}
      </p>
    </div>
  );
}
