"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Monitor, Moon, Search, Sun } from "lucide-react";

import { AvatarNome } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { BuscaGlobal } from "./busca-global";
import { rotuloRole, useAuthStore } from "@/stores/auth-store";

export function Topbar({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const sair = useAuthStore((s) => s.sair);
  const { tema, definirTema } = useTheme();
  const [buscaAberta, setBuscaAberta] = React.useState(false);

  // Ctrl/Cmd+K abre a busca de qualquer lugar do app.
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta(true);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  async function aoSair() {
    await sair();
    router.replace("/login");
  }

  const icones = { light: Sun, dark: Moon, system: Monitor };
  const IconeTema = icones[tema];

  return (
    <>
      <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onAbrirMenu}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </Button>

        <button
          onClick={() => setBuscaAberta(true)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 flex-1 items-center gap-2 rounded-lg border px-3 text-sm transition-colors md:max-w-sm"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Buscar leads...</span>
          <kbd className="bg-muted hidden rounded border px-1.5 py-0.5 font-mono text-[10px] md:inline-block">
            Ctrl K
          </kbd>
        </button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Alternar tema">
              <IconeTema className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => definirTema("light")}>
              <Sun /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => definirTema("dark")}>
              <Moon /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => definirTema("system")}>
              <Monitor /> Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-accent flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors">
              <AvatarNome nome={usuario?.nome ?? "?"} className="size-7" />
              <div className="hidden text-left leading-tight sm:block">
                <p className="max-w-32 truncate text-xs font-medium">
                  {usuario?.nome}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {usuario ? rotuloRole[usuario.role] : ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-foreground text-sm font-medium">
              {usuario?.nome}
              <p className="text-muted-foreground truncate text-xs font-normal">
                {usuario?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={aoSair}>
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <BuscaGlobal aberta={buscaAberta} onFechar={() => setBuscaAberta(false)} />
    </>
  );
}
