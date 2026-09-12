"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

import { Logo, LogoMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navGestao, navPrincipal, podeVer, type NavItem } from "./nav-items";
import { api, USE_MOCK } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

function ItemNav({
  item,
  recolhida,
  contagem,
  onNavigate,
}: {
  item: NavItem;
  recolhida: boolean;
  contagem?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icone = item.icone;

  const conteudo = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        recolhida && "justify-center px-0",
        ativo
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {/* Marcador da rota ativa */}
      {ativo && (
        <span className="bg-primary absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
      )}
      <Icone className="size-4 shrink-0" />
      {!recolhida && <span className="flex-1 truncate">{item.rotulo}</span>}
      {!recolhida && contagem !== undefined && contagem > 0 && (
        <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
          {contagem}
        </Badge>
      )}
      {recolhida && contagem !== undefined && contagem > 0 && (
        <span className="bg-warning absolute top-1 right-1 size-1.5 rounded-full" />
      )}
    </Link>
  );

  if (!recolhida) return conteudo;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{conteudo}</TooltipTrigger>
      <TooltipContent side="right">{item.rotulo}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  recolhida,
  onToggle,
  onNavigate,
  className,
}: {
  recolhida: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const role = useAuthStore((s) => s.usuario?.role);

  // Alimenta o badge de leads parados há mais de 3 dias.
  const { data: ociosos } = useQuery({
    queryKey: ["ociosos"],
    queryFn: () => api.listarOciosos(),
    enabled: role === "ADMIN" || role === "GERENTE",
    staleTime: 60_000,
  });

  const contagens = { ociosos: ociosos?.length };

  const principais = navPrincipal.filter((i) => podeVer(i, role));
  const gestao = navGestao.filter((i) => podeVer(i, role));

  return (
    <aside
      className={cn(
        "bg-sidebar border-sidebar-border flex h-full flex-col border-r transition-[width] duration-200",
        recolhida ? "w-[68px]" : "w-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 px-4",
          recolhida && "justify-center px-0",
        )}
      >
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          {recolhida ? <LogoMark /> : <Logo />}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {!recolhida && (
            <p className="text-muted-foreground px-3 pb-1 text-[10px] font-semibold tracking-widest uppercase">
              Operação
            </p>
          )}
          {principais.map((item) => (
            <ItemNav
              key={item.href}
              item={item}
              recolhida={recolhida}
              contagem={item.badge ? contagens[item.badge] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {gestao.length > 0 && (
          <div className="space-y-1">
            {!recolhida && (
              <p className="text-muted-foreground px-3 pb-1 text-[10px] font-semibold tracking-widest uppercase">
                Gestão
              </p>
            )}
            {gestao.map((item) => (
              <ItemNav
                key={item.href}
                item={item}
                recolhida={recolhida}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Aviso permanente de que os dados são simulados */}
      {USE_MOCK && !recolhida && (
        <div className="mx-3 mb-3 rounded-lg border border-dashed p-3">
          <div className="text-primary flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5 animate-pulse-ring" />
            Modo demonstração
          </div>
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
            Dados simulados. Conecte a API real em{" "}
            <code className="text-[10px]">.env.local</code>.
          </p>
        </div>
      )}

      {onToggle && (
        <div className={cn("border-t p-2", recolhida && "flex justify-center")}>
          <Button
            variant="ghost"
            size={recolhida ? "icon-sm" : "sm"}
            onClick={onToggle}
            className={cn(!recolhida && "w-full justify-start gap-2")}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          >
            {recolhida ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                Recolher
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}
