"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const TAMANHO_TOKEN = 64;
const SENHA_MINIMA = 6;

export default function ResetSenhaPage() {
  // O useSearchParams exige um Suspense em volta; sem ele o `next build` falha.
  return (
    <React.Suspense fallback={null}>
      <FormularioResetSenha />
    </React.Suspense>
  );
}

function FormularioResetSenha() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const linkValido = token.length === TAMANHO_TOKEN;

  const [senha, setSenha] = React.useState("");
  const [confirmacao, setConfirmacao] = React.useState("");
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setCarregando(true);
    try {
      const { message } = await api.redefinirSenha(token, senha);
      toast.success(message);
      router.replace("/login");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="bg-glow flex min-h-screen items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <Logo />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">Criar nova senha</h2>

        {linkValido ? (
          <>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Escolha uma senha com pelo menos {SENHA_MINIMA} caracteres. Depois de salvar, você
              entra de novo com ela.
            </p>

            <form onSubmit={aoEnviar} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
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
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacao">Repita a nova senha</Label>
                <Input
                  id="confirmacao"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!erro}
                />
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

              <Button type="submit" variant="brand" size="lg" loading={carregando} className="w-full">
                Salvar nova senha
              </Button>
            </form>
          </>
        ) : (
          <p
            role="alert"
            className="border-destructive/25 bg-destructive/10 text-destructive mt-6 rounded-lg border px-3 py-2 text-sm"
          >
            Este link de recuperação é inválido ou está incompleto. Volte para o login e clique em
            &quot;Esqueci minha senha&quot; para receber um novo.
          </p>
        )}

        <Link
          href="/login"
          className="text-muted-foreground hover:text-primary mt-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </motion.div>
    </div>
  );
}
