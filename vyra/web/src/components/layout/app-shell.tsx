"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";


import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { podeAcessarRota } from "./nav-items";
import { LogoMark } from "@/components/logo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";

const CHAVE_RECOLHIDA = "vyra.sidebar-recolhida";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const hidratado = useAuthStore((s) => s.hidratado);
  const pathname = usePathname();
  const autorizado = usuario ? podeAcessarRota(pathname, usuario.role) : false;


  const [recolhida, setRecolhida] = React.useState(false);
  const [menuMobile, setMenuMobile] = React.useState(false);

  // Preferência de sidebar recolhida sobrevive a recarregamentos.
  React.useEffect(() => {
    setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "true");
  }, []);

  function alternarRecolhida() {
    setRecolhida((atual) => {
      localStorage.setItem(CHAVE_RECOLHIDA, String(!atual));
      return !atual;
    });
  }

   // Guarda de sessão: só decide depois que a tentativa de restaurar a sessão terminou.
  React.useEffect(() => {
    if (hidratado && !usuario) router.replace("/login");
  }, [hidratado, usuario, router]);

  // Guarda de papel: usa as mesmas regras do menu (nav-items.ts).
  React.useEffect(() => {
    if (hidratado && usuario && !autorizado) {
      toast.error("Você não tem permissão para acessar essa página.", { id: "sem-permissao" });
      router.replace("/dashboard");
    }
  }, [hidratado, usuario, autorizado, router]);


    if (!hidratado || !usuario || !autorizado) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }

  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        recolhida={recolhida}
        onToggle={alternarRecolhida}
        className="hidden lg:flex"
      />

      {/* Navegação em telas pequenas */}
      <Dialog open={menuMobile} onOpenChange={setMenuMobile}>
        <DialogContent
          showClose={false}
          className="top-0 left-0 h-screen max-w-60 translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
          <Sidebar recolhida={false} onNavigate={() => setMenuMobile(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={() => setMenuMobile(true)} />
        <main className="bg-background flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/** Cabeçalho padrão das páginas internas. */
export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && (
          <p className="text-muted-foreground mt-1 text-sm">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
