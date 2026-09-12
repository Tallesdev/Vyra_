"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  refreshToken: string | null;
  /** false até o estado persistido ser reidratado — evita piscar a tela de login. */
  hidratado: boolean;

  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  marcarHidratado: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      hidratado: false,

      entrar: async (email, senha) => {
        const { accessToken, refreshToken, usuario } = await api.login(email, senha);
        set({ accessToken, refreshToken, usuario });
      },

      sair: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.logout(refreshToken);
        } catch {
          // Sair é sempre local, mesmo que a API recuse o token.
        }
        set({ usuario: null, accessToken: null, refreshToken: null });
      },

      marcarHidratado: () => set({ hidratado: true }),
    }),
    {
      name: "vyra.auth",
      partialize: (state) => ({
        usuario: state.usuario,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => state?.marcarHidratado(),
    },
  ),
);

// Permite ao cliente de API anexar o Bearer token sem importar o store
// (evita ciclo de dependência entre api.ts e auth-store.ts).
registrarTokenGetter(() => useAuthStore.getState().accessToken);

// Quando a API responde 401, o cliente pede a renovação por aqui.
registrarRenovacao(async () => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const { accessToken } = await api.renovarToken(refreshToken);
    useAuthStore.setState({ accessToken });
    return true;
  } catch {
    // Refresh token também expirou: encerra a sessão localmente.
    useAuthStore.setState({
      usuario: null,
      accessToken: null,
      refreshToken: null,
    });
    return false;
  }
});

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
