import { Flame, Snowflake, Sparkles, Thermometer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadStatus, Marcador } from "@/lib/types";

/* ── Status do lead ────────────────────────────────────────── */

const statusConfig: Record<
  LeadStatus,
  { rotulo: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  NOVO: { rotulo: "Novo", variant: "brand" },
  EM_ANDAMENTO: { rotulo: "Em andamento", variant: "info" },
  GANHOU: { rotulo: "Ganhou", variant: "success" },
  PERDEU: { rotulo: "Perdeu", variant: "destructive" },
  REPESCAGEM: { rotulo: "Repescagem", variant: "warning" },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { rotulo, variant } = statusConfig[status];
  return <Badge variant={variant}>{rotulo}</Badge>;
}

/* ── Temperatura do lead ───────────────────────────────────── */

const marcadorConfig: Record<
  Marcador,
  { rotulo: string; icone: typeof Flame; classe: string }
> = {
  FRIO: {
    rotulo: "Frio",
    icone: Snowflake,
    classe: "border-frio/30 bg-frio/12 text-frio",
  },
  MORNO: {
    rotulo: "Morno",
    icone: Thermometer,
    classe: "border-morno/30 bg-morno/15 text-morno",
  },
  QUENTE: {
    rotulo: "Quente",
    icone: Flame,
    classe: "border-quente/30 bg-quente/12 text-quente",
  },
};

export function MarcadorBadge({
  marcador,
  showLabel = true,
}: {
  marcador: Marcador;
  showLabel?: boolean;
}) {
  const { rotulo, icone: Icone, classe } = marcadorConfig[marcador];
  return (
    <Badge variant="outline" className={cn(classe)} title={rotulo}>
      <Icone />
      {showLabel && rotulo}
    </Badge>
  );
}

/* ── Lead que a IA não conseguiu atribuir ──────────────────── */

export function SemCriterioBadge() {
  return (
    <Badge
      variant="warning"
      title="A IA não encontrou um consultor compatível para este lead"
    >
      <Sparkles />
      Sem critério
    </Badge>
  );
}
