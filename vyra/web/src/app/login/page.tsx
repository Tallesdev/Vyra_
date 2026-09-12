"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  BrainCircuit,
  Columns3,
  Eye,
  EyeOff,
  Gauge,
  Mail,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, USE_MOCK } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const destaques = [
  {
    icone: BrainCircuit,
    titulo: "Atribuição por IA",
    texto:
      "Cada lead vai para o consultor semanticamente mais compatível, não para o próximo da fila.",
  },
  {
    icone: Columns3,
    titulo: "Funil visual",
    texto:
      "Arraste oportunidades entre etapas e acompanhe o pipeline em tempo real.",
  },
  {
    icone: Gauge,
    titulo: "Nada esfria",
    texto:
      "Leads parados há mais de 3 dias sobem automaticamente para o radar da gestão.",
  },
];

/** Contas do modo demonstração — um clique preenche o formulário. */
const contasDemo = [
  { rotulo: "Administrador", email: "admin@vyra.com" },
  { rotulo: "Gerente", email: "marina@vyra.com" },
  { rotulo: "Consultor", email: "ana@vyra.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const entrar = useAuthStore((s) => s.entrar);
  const usuario = useAuthStore((s) => s.usuario);
  const hidratado = useAuthStore((s) => s.hidratado);

  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // Quem já está autenticado não vê o login.
  React.useEffect(() => {
    if (hidratado && usuario) router.replace("/dashboard");
  }, [hidratado, usuario, router]);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await entrar(email, senha);
      router.replace("/dashboard");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setCarregando(false);
    }
  }

  async function aoRecuperar() {
    if (!email.trim()) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    const { message } = await api.recuperarSenha(email);
    toast.success(message);
  }

  function preencherDemo(emailDemo: string) {
    setEmail(emailDemo);
    setSenha("demo123");
    setErro(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Painel de marca ─────────────────────────────────── */}
      <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        {/* Textura sutil sobre o gradiente */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 size-96 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5 text-white">
          <LogoMark className="size-9 drop-shadow" />
          <span className="text-xl font-semibold tracking-tight">Vyra</span>
        </div>

        <div className="relative max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl leading-tight font-semibold tracking-tight text-balance text-white"
          >
            O lead certo, com o consultor certo.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 text-base leading-relaxed text-white/75"
          >
            CRM focado em performance e facilidade de uso. A distribuição de
            leads acontece por compatibilidade semântica — não por sorteio.
          </motion.p>

          <div className="mt-12 space-y-6">
            {destaques.map((d, i) => (
              <motion.div
                key={d.titulo}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.16 + i * 0.08 }}
                className="flex gap-4"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white backdrop-blur">
                  <d.icone className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{d.titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/65">
                    {d.texto}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          Trabalho de Conclusão de Curso · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Formulário ──────────────────────────────────────── */}
      <div className="bg-glow flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            Entrar na sua conta
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Use suas credenciais corporativas para acessar o painel.
          </p>

          <form onSubmit={aoEnviar} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  className="pl-9"
                  aria-invalid={!!erro}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button
                  type="button"
                  onClick={aoRecuperar}
                  className="text-muted-foreground hover:text-primary text-xs transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                  aria-invalid={!!erro}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                >
                  {mostrarSenha ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {erro && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="border-destructive/25 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
              >
                {erro}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={carregando}
              className="w-full"
            >
              Entrar
              {!carregando && <ArrowRight className="size-4" />}
            </Button>
          </form>

          {USE_MOCK && (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  Modo demonstração
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Escolha um perfil para preencher o formulário. Qualquer senha com
                6+ caracteres é aceita.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {contasDemo.map((c) => (
                  <Button
                    key={c.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => preencherDemo(c.email)}
                  >
                    {c.rotulo}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
