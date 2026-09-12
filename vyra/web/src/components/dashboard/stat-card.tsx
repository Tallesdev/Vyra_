import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  rotulo,
  valor,
  variacao,
  icone: Icone,
  tom = "brand",
  rodape,
  carregando,
}: {
  rotulo: string;
  valor: string;
  variacao?: number;
  icone: LucideIcon;
  tom?: "brand" | "success" | "warning" | "info";
  rodape?: string;
  carregando?: boolean;
}) {
  const tons = {
    brand: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/12 text-info",
  };

  if (carregando) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </Card>
    );
  }

  // Queda no ticket médio não é necessariamente ruim, mas a seta segue o sinal.
  const positiva = variacao !== undefined && variacao >= 0;

  return (
    <Card className="group p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{rotulo}</p>
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105",
            tons[tom],
          )}
        >
          <Icone className="size-4" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        {valor}
      </p>

      <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
        {variacao !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positiva ? "text-success" : "text-destructive",
            )}
          >
            {positiva ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(variacao).toFixed(1).replace(".", ",")}%
          </span>
        )}
        {rodape && <span className="truncate">{rodape}</span>}
      </div>
    </Card>
  );
}
