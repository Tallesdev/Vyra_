"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarcadorBadge, StatusBadge } from "@/components/leads/lead-badges";
import { api } from "@/lib/api";
import { cn, formatPhone } from "@/lib/utils";

/** Paleta de busca (Ctrl+K): filtra leads por nome, e-mail ou telefone. */
export function BuscaGlobal({
  aberta,
  onFechar,
}: {
  aberta: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [termo, setTermo] = React.useState("");
  const [indice, setIndice] = React.useState(0);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => api.listarLeads(),
    enabled: aberta,
  });

  const resultados = React.useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return leads.slice(0, 7);
    return leads
      .filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.telefone.includes(q.replace(/\D/g, "")),
      )
      .slice(0, 7);
  }, [leads, termo]);

  // Reinicia o estado sempre que a paleta abre.
  React.useEffect(() => {
    if (aberta) {
      setTermo("");
      setIndice(0);
    }
  }, [aberta]);

  React.useEffect(() => setIndice(0), [termo]);

  function abrir(id: string) {
    onFechar();
    router.push(`/leads/${id}`);
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[indice]) {
      e.preventDefault();
      abrir(resultados[indice].id);
    }
  }

  return (
    <Dialog open={aberta} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent
        showClose={false}
        className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Buscar leads</DialogTitle>
        <DialogDescription className="sr-only">
          Digite para filtrar leads por nome, e-mail ou telefone.
        </DialogDescription>

        <div className="flex items-center gap-3 border-b px-4">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {resultados.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              Nenhum lead encontrado para “{termo}”.
            </p>
          ) : (
            resultados.map((lead, i) => (
              <button
                key={lead.id}
                onClick={() => abrir(lead.id)}
                onMouseEnter={() => setIndice(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  i === indice ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <div className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{lead.nome}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {lead.email ?? formatPhone(lead.telefone)}
                  </p>
                </div>
                <MarcadorBadge marcador={lead.marcador} showLabel={false} />
                <StatusBadge status={lead.status} />
              </button>
            ))
          )}
        </div>

        <div className="text-muted-foreground bg-muted/40 flex items-center gap-3 border-t px-4 py-2 text-[11px]">
          <span>
            <kbd className="bg-background rounded border px-1 py-0.5 font-mono">↑↓</kbd>{" "}
            navegar
          </span>
          <span>
            <kbd className="bg-background rounded border px-1 py-0.5 font-mono">↵</kbd>{" "}
            abrir
          </span>
          <span>
            <kbd className="bg-background rounded border px-1 py-0.5 font-mono">esc</kbd>{" "}
            fechar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
