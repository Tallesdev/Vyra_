"use client";

import { create } from "zustand";

import { api, registrarRenovacao, registrarTokenGetter } from "@/lib/api";
import type { Role } from "@/lib/types";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

interface AuthState {
  usuario: UsuarioSessao | null;
  accessToken: string | null;
  /** false até a tentativa de restaurar a sessão terminar — evita piscar a tela de login. */
  hidratado: boolean;

  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  restaurarSessao: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  usuario: null,
  accessToken: null,
  hidratado: false,

  entrar: async (email, senha) => {
    const { accessToken, usuario } = await api.login(email, senha);
    set({ accessToken, usuario });
  },

  sair: async () => {
    try {
      await api.logout();
    } catch {
      // Sair é sempre local, mesmo que a API recuse.
    }
    set({ usuario: null, accessToken: null });
  },

  restaurarSessao: async () => {
    try {
      const { accessToken, usuario } = await api.renovarToken();
      set({ accessToken, usuario });
    } catch {
      // Sem cookie de sessão válido: segue deslogado.
    } finally {
      set({ hidratado: true });
    }
  },
}));

// Permite ao cliente de API anexar o Bearer token sem importar o store
// (evita ciclo de dependência entre api.ts e auth-store.ts).
registrarTokenGetter(() => useAuthStore.getState().accessToken);

// Quando a API responde 401, o cliente pede a renovação por aqui.
registrarRenovacao(async () => {
  try {
    const { accessToken, usuario } = await api.renovarToken();
    useAuthStore.setState({ accessToken, usuario });
    return true;
  } catch {
    useAuthStore.setState({ usuario: null, accessToken: null });
    return false;
  }
});

if (typeof window !== "undefined") {
  // A versão anterior guardava os tokens aqui; apaga o que tiver sobrado.
  localStorage.removeItem("vyra.auth");
  void useAuthStore.getState().restaurarSessao();
}

/* ── Permissões por papel ──────────────────────────────────── */

export const permissoes = {
  gerenciarUsuarios: (role?: Role) => role === "ADMIN",
  verEquipe: (role?: Role) => role === "ADMIN" || role === "GERENTE",
  gerenciarPipelines: (role?: Role) => role === "ADMIN" || role === "GERENTE",
  gerenciarTemplates: (role?: Role) => role === "ADMIN" || role === "GERENTE",
  reatribuirLead: (role?: Role) => role === "ADMIN" || role === "GERENTE",
  verOciosos: (role?: Role) => role === "ADMIN" || role === "GERENTE",
};

export const rotuloRole: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  CONSULTOR: "Consultor",
};
