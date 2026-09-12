"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/app-shell";
import { MarcadorBadge, StatusBadge } from "@/components/leads/lead-badges";
import { AvatarNome } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, daysSince, formatBRL, whatsappLink } from "@/lib/utils";
import type { Lead } from "@/lib/types";

/** Três faixas de urgência para priorizar a retomada. */
const faixas = [
  {
    chave: "critico",
    rotulo: "Crítico",
    descricao: "Parados há 10 dias ou mais",
    min: 10,
    classe: "border-destructive/30 bg-destructive/[0.05]",
    ponto: "bg-destructive",
  },
  {
    chave: "atencao",
    rotulo: "Atenção",
    descricao: "Parados entre 6 e 9 dias",
    min: 6,
    classe: "border-warning/30 bg-warning/[0.05]",
    ponto: "bg-warning",
  },
  {
    chave: "recente",
    rotulo: "Recente",
    descricao: "Parados entre 3 e 5 dias",
    min: 3,
    classe: "border-border",
    ponto: "bg-muted-foreground",
  },
] as const;

function LinhaLead({ lead }: { lead: Lead }) {
  const parado = daysSince(lead.ultimaMovimentacao);

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <Link href={`/leads/${lead.id}`} className="flex min-w-48 flex-1 items-center gap-3">
        <AvatarNome nome={lead.nome} className="size-8" />
        <div className="min-w-0">
          <p className="hover:text-primary truncate text-sm font-medium transition-colors">
            {lead.nome}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {lead.consultor ? lead.consultor.nome : "Sem consultor"} ·{" "}
            {formatBRL(lead.valorEstimado)}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <MarcadorBadge marcador={lead.marcador} showLabel={false} />
        <StatusBadge status={lead.status} />
        <span className="text-warning w-12 text-right text-sm font-medium tabular-nums">
          {parado}d
        </span>
        <Button asChild variant="ghost" size="icon-sm" title="Retomar no WhatsApp">
          <a
            href={whatsappLink(
              lead.telefone,
              `Olá ${lead.nome.split(" ")[0]}, tudo bem? Retomando nossa conversa.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
          </a>
        </Button>
      </div>
    </li>
  );
}

export default function OciososPage() {
  const ociosos = useQuery({
    queryKey: ["ociosos"],
    queryFn: () => api.listarOciosos(),
  });

  const agrupados = faixas.map((faixa, i) => {
    const max = i === 0 ? Infinity : faixas[i - 1].min - 1;
    return {
      ...faixa,
      leads: (ociosos.data ?? [])
        .filter((l) => {
          const d = daysSince(l.ultimaMovimentacao);
          return d >= faixa.min && d <= max;
        })
        .sort(
          (a, b) =>
            daysSince(b.ultimaMovimentacao) - daysSince(a.ultimaMovimentacao),
        ),
    };
  });

  const total = ociosos.data?.length ?? 0;
  const valorParado = (ociosos.data ?? []).reduce(
    (s, l) => s + (l.valorEstimado ?? 0),
    0,
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo="Leads ociosos"
        descricao={
          ociosos.isPending
            ? "Carregando..."
            : `${total} ${total === 1 ? "oportunidade parada" : "oportunidades paradas"} há mais de 3 dias · ${formatBRL(valorParado)} em risco`
        }
      />

      {ociosos.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            titulo="Nenhum lead parado"
            descricao="Toda a carteira teve movimentação nos últimos 3 dias. Bom trabalho."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {agrupados
            .filter((g) => g.leads.length > 0)
            .map((grupo) => (
              <Card key={grupo.chave} className={cn(grupo.classe)}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className={cn("size-2.5 rounded-full", grupo.ponto)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{grupo.rotulo}</p>
                      <p className="text-muted-foreground text-xs">
                        {grupo.descricao}
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {grupo.leads.length}
                    </span>
                  </div>

                  <ul className="divide-y border-t">
                    {grupo.leads.map((lead) => (
                      <LinhaLead key={lead.id} lead={lead} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Card className="bg-muted/40">
        <CardContent className="flex gap-3 py-4">
          <Clock className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            A régua de ociosidade considera a data da última movimentação do lead
            no funil. Leads ganhos ou perdidos não entram nesta lista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
