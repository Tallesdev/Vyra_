"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/app-shell";
import { AvatarNome } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { permissoes, rotuloRole, useAuthStore } from "@/stores/auth-store";
import type { Role, Usuario } from "@/lib/types";

const coresRole: Record<Role, React.ComponentProps<typeof Badge>["variant"]> = {
  ADMIN: "brand",
  GERENTE: "info",
  CONSULTOR: "muted",
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.usuario?.role);
  const podeGerenciar = permissoes.gerenciarUsuarios(role);

  const [criando, setCriando] = React.useState(false);
  const [editandoPerfil, setEditandoPerfil] = React.useState<Usuario | null>(null);

  const usuarios = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api.listarUsuarios(),
  });
  const ranking = useQuery({
    queryKey: ["ranking"],
    queryFn: () => api.obterRanking(),
  });

  const criar = useMutation({
    mutationFn: api.criarUsuario,
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setCriando(false);
      toast.success(`${u.nome} foi adicionado à equipe.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const desativar = useMutation({
    mutationFn: api.desativarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário desativado.");
    },
    onError: () => toast.error("Não foi possível desativar."),
  });

  const salvarPerfil = useMutation({
    mutationFn: ({ id, descricao }: { id: string; descricao: string }) =>
      api.atualizarPerfilIA(id, descricao),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setEditandoPerfil(null);
      toast.success(`Perfil de IA de ${u.nome} atualizado.`);
    },
    onError: () => toast.error("Não foi possível salvar o perfil."),
  });

  const gerentes = usuarios.data?.filter((u) => u.role === "GERENTE") ?? [];

  /** Desempenho por consultor, para exibir junto do card. */
  const desempenho = new Map(
    ranking.data?.map((r) => [r.consultor.id, r]) ?? [],
  );

  const porPapel: Role[] = ["ADMIN", "GERENTE", "CONSULTOR"];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo="Equipe"
        descricao="Usuários do sistema e seus perfis de compatibilidade com leads."
        acoes={
          podeGerenciar && (
            <Button variant="brand" onClick={() => setCriando(true)}>
              <Plus className="size-4" />
              Novo usuário
            </Button>
          )
        }
      />

      {usuarios.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (usuarios.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            titulo="Nenhum usuário cadastrado"
            descricao="Adicione consultores para que a IA possa distribuir os leads."
          />
        </Card>
      ) : (
        porPapel.map((papel) => {
          const doPapel = usuarios.data!.filter((u) => u.role === papel);
          if (doPapel.length === 0) return null;

          return (
            <section key={papel} className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {rotuloRole[papel]}
                <span className="ml-2 font-normal">({doPapel.length})</span>
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {doPapel.map((u) => {
                  const perf = desempenho.get(u.id);

                  return (
                    <Card
                      key={u.id}
                      className={u.ativo ? "" : "opacity-60"}
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start gap-3">
                          <AvatarNome nome={u.nome} className="size-10" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.nome}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {u.email}
                            </p>
                          </div>

                          {podeGerenciar && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Ações para ${u.nome}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditandoPerfil(u)}
                                >
                                  <BrainCircuit /> Editar perfil de IA
                                </DropdownMenuItem>
                                {u.ativo && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => desativar.mutate(u.id)}
                                  >
                                    <UserRound /> Desativar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={coresRole[u.role]}>
                            {u.role === "ADMIN" && <ShieldCheck />}
                            {rotuloRole[u.role]}
                          </Badge>
                          {!u.ativo && <Badge variant="muted">Inativo</Badge>}
                        </div>

                        {u.perfilDescricao ? (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
                              <BrainCircuit className="size-3" />
                              Perfil de IA
                            </p>
                            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed">
                              {u.perfilDescricao}
                            </p>
                          </div>
                        ) : (
                          <div className="border-warning/30 bg-warning/[0.06] rounded-lg border border-dashed p-3">
                            <p className="text-warning text-xs">
                              Sem perfil de IA — este consultor não recebe leads
                              automaticamente.
                            </p>
                          </div>
                        )}

                        {perf && (
                          <div className="flex items-center justify-between border-t pt-3 text-xs">
                            <span className="text-muted-foreground">
                              {perf.ganhos}/{perf.leads} leads
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatBRL(perf.valorGanho)}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <DialogoNovoUsuario
        aberto={criando}
        onFechar={() => setCriando(false)}
        gerentes={gerentes}
        onConfirmar={(dados) => criar.mutate(dados)}
        enviando={criar.isPending}
      />

      <DialogoPerfilIA
        usuario={editandoPerfil}
        onFechar={() => setEditandoPerfil(null)}
        onConfirmar={(descricao) =>
          editandoPerfil &&
          salvarPerfil.mutate({ id: editandoPerfil.id, descricao })
        }
        enviando={salvarPerfil.isPending}
      />
    </div>
  );
}

function DialogoNovoUsuario({
  aberto,
  onFechar,
  gerentes,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  gerentes: Usuario[];
  onConfirmar: (dados: {
    nome: string;
    email: string;
    senha: string;
    role: Role;
    gerenteId?: string;
    perfilDescricao?: string;
  }) => void;
  enviando: boolean;
}) {
  const vazio = {
    nome: "",
    email: "",
    senha: "",
    role: "CONSULTOR" as Role,
    gerenteId: "",
    perfilDescricao: "",
  };
  const [form, setForm] = React.useState(vazio);

  React.useEffect(() => {
    if (aberto) setForm(vazio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const valido =
    form.nome.trim() && form.email.trim() && form.senha.length >= 6;

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Consultores precisam de um perfil descritivo para receber leads da IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nu-nome">Nome completo</Label>
            <Input
              id="nu-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ana Paula Souza"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nu-email">E-mail</Label>
              <Input
                id="nu-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ana@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-senha">Senha provisória</Label>
              <Input
                id="nu-senha"
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nu-role">Papel</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger id="nu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSULTOR">Consultor</SelectItem>
                  <SelectItem value="GERENTE">Gerente</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "CONSULTOR" && gerentes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="nu-ger">Gerente responsável</Label>
                <Select
                  value={form.gerenteId}
                  onValueChange={(v) => setForm({ ...form, gerenteId: v })}
                >
                  <SelectTrigger id="nu-ger">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {gerentes.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {form.role === "CONSULTOR" && (
            <div className="space-y-2">
              <Label htmlFor="nu-perfil">Perfil de compatibilidade (IA)</Label>
              <Textarea
                id="nu-perfil"
                value={form.perfilDescricao}
                onChange={(e) =>
                  setForm({ ...form, perfilDescricao: e.target.value })
                }
                placeholder="Ex.: Especialista em ERP para indústrias de médio porte. Domina NF-e, SPED e migração de sistemas legados."
                className="min-h-24"
              />
              <p className="text-muted-foreground text-xs">
                Quanto mais específico, melhor a IA associa leads a este consultor.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            disabled={!valido}
            onClick={() =>
              onConfirmar({
                nome: form.nome,
                email: form.email,
                senha: form.senha,
                role: form.role,
                gerenteId: form.gerenteId || undefined,
                perfilDescricao: form.perfilDescricao || undefined,
              })
            }
          >
            Criar usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoPerfilIA({
  usuario,
  onFechar,
  onConfirmar,
  enviando,
}: {
  usuario: Usuario | null;
  onFechar: () => void;
  onConfirmar: (descricao: string) => void;
  enviando: boolean;
}) {
  const [descricao, setDescricao] = React.useState("");

  React.useEffect(() => {
    setDescricao(usuario?.perfilDescricao ?? "");
  }, [usuario]);

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perfil de IA — {usuario?.nome}</DialogTitle>
          <DialogDescription>
            Esta descrição vira um vetor semântico usado para casar leads com o
            consultor mais compatível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="pi-desc">Descrição do perfil</Label>
          <Textarea
            id="pi-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva especialidades, setores atendidos e tipo de cliente ideal..."
            className="min-h-40"
          />
          <p className="text-muted-foreground text-xs">
            Salvar recalcula o embedding — pode levar alguns segundos.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            disabled={!descricao.trim()}
            onClick={() => onConfirmar(descricao.trim())}
          >
            <BrainCircuit className="size-4" />
            Salvar e recalcular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
