"use client";

import * as React from "react";

type Tema = "light" | "dark" | "system";
type TemaResolvido = "light" | "dark";

const STORAGE_KEY = "vyra.tema";

interface ThemeContextValue {
  tema: Tema;
  resolvido: TemaResolvido;
  definirTema: (tema: Tema) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Script injetado antes da hidratação: aplica a classe `dark` já na primeira
 * pintura, evitando o flash de tema claro em quem usa tema escuro.
 */
export const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var escuro = t === 'dark' || (t === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (escuro) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

function resolver(tema: Tema): TemaResolvido {
  if (tema !== "system") return tema;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = React.useState<Tema>("system");
  const [resolvido, setResolvido] = React.useState<TemaResolvido>("light");

  // Lê a preferência salva depois da montagem — o script acima já cuidou da pintura.
  React.useEffect(() => {
    const salvo = (localStorage.getItem(STORAGE_KEY) as Tema | null) ?? "system";
    setTema(salvo);
    setResolvido(resolver(salvo));
  }, []);

  // Mantém a classe do <html> em sincronia com o tema escolhido.
  React.useEffect(() => {
    const alvo = resolver(tema);
    setResolvido(alvo);
    document.documentElement.classList.toggle("dark", alvo === "dark");
  }, [tema]);

  // Acompanha mudanças do sistema operacional enquanto o modo for "system".
  React.useEffect(() => {
    if (tema !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => {
      const alvo = mq.matches ? "dark" : "light";
      setResolvido(alvo);
      document.documentElement.classList.toggle("dark", alvo === "dark");
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, [tema]);

  const definirTema = React.useCallback((novo: Tema) => {
    localStorage.setItem(STORAGE_KEY, novo);
    setTema(novo);
  }, []);

  const valor = React.useMemo(
    () => ({ tema, resolvido, definirTema }),
    [tema, resolvido, definirTema],
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
