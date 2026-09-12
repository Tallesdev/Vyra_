import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estado vazio padrão — mantém a mesma voz em todas as listas do produto. */
function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
  className,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground mb-4 grid size-12 place-items-center rounded-xl">
        <Icon className="size-6" />
      </div>
      <p className="font-medium">{titulo}</p>
      {descricao && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm text-balance">
          {descricao}
        </p>
      )}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export { EmptyState };
