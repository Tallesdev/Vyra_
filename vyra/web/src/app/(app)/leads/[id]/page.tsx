"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Send,
  Sparkles,
  Trophy,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import {
  MarcadorBadge,
  SemCriterioBadge,
  StatusBadge,
} from "@/components/leads/lead-badges";
import { Timeline } from "@/components/leads/timeline";
import { AvatarNome } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { rotuloOrigem } from "@/lib/mock-data";
import {
  daysSince,
  formatBRL,
  formatDateTime,
  formatPhone,
  interpolate,
  whatsappLink,
} from "@/lib/utils";
import { permissoes, useAuthStore } from "@/stores/auth-store";
import type { Marcador } from "@/lib/types";

export default function LeadDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.usuario?.role);

  const [dialogo, setDialogo] = React.useState<
    "fechar" | "reatribuir" | "editar" | "email" | null
  >(null);

  const lead = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.obterLead(id),
  });
  const timeline = useQuery({
    queryKey: ["timeline", id],
    queryFn: () => api.obterTimeline(id),
  });
  const usuarios = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api.listarUsuarios(),
    enabled: permissoes.reatribuirLead(role),
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.listarTemplates(),
  });

  /** Revalida tudo que depende deste lead após uma escrita. */
  function revalidar() {
    queryClient.invalidateQueries({ queryKey: ["lead", id] });
    queryClient.invalidateQueries({ queryKey: ["timeline", id] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["metricas"] });
    queryClient.invalidateQueries({ queryKey: ["ociosos"] });
  }

  const adicionarAtividade = useMutation({
    mutationFn: ({ descricao, tipo }: { descricao: string; tipo: "ATIVIDADE" | "NOTA" }) =>
      api.adicionarAtividade(id, descricao, tipo),
    onSuccess: () => {
      revalidar();
      toast.success("Registro adicionado à timeline.");
    },
    onError: () => toast.error("Não foi possível registrar."),
  });

  const fechar = useMutation({
    mutationFn: (dados: {
      resultado: "GANHOU" | "PERDEU";
      motivoPerda?: string;
      valorFinal?: number;
    }) => api.fecharOportunidade(id, dados),
    onSuccess: (l) => {
      revalidar();
      setDialogo(null);
      toast.success(
        l.status === "GANHOU"
          ? "Oportunidade marcada como ganha."
          : "Oportunidade marcada como perdida.",
      );
    },
    onError: () => toast.error("Não foi possível fechar a oportunidade."),
  });

  const reatribuir = useMutation({
    mutationFn: (consultorId: string) => api.reatribuirLead(id, consultorId),
    onSuccess: (l) => {
      revalidar();
      setDialogo(null);
      toast.success(`Lead reatribuído para ${l.consultor?.nome}.`);
    },
    onError: () => toast.error("Não foi possível reatribuir."),
  });

  const editar = useMutation({
    mutationFn: (dados: Parameters<typeof api.atualizarLead>[1]) =>
      api.atualizarLead(id, dados),
    onSuccess: () => {
      revalidar();
      setDialogo(null);
      toast.success("Dados atualizados.");
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const enviarEmail = useMutation({
    mutationFn: ({ assunto, corpo }: { assunto: string; corpo: string }) =>
      api.enviarEmail(id, assunto, corpo),
    onSuccess: () => {
      revalidar();
      setDialogo(null);
      toast.success("E-mail enviado.");
    },
    onError: () => toast.error("Não foi possível enviar o e-mail."),
  });

  if (lead.isPending) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (lead.isError || !lead.data) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <p className="font-medium">Lead não encontrado</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Ele pode ter sido removido ou você não tem acesso.
          </p>
          <Button asChild variant="outline" className="mx-auto mt-5">
            <Link href="/leads">Voltar para a lista</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const l = lead.data;
  const fechado = l.status === "GANHOU" || l.status === "PERDEU";
  const parado = daysSince(l.ultimaMovimentacao);
  const consultoresDisponiveis =
    usuarios.data?.filter((u) => u.role === "CONSULTOR" && u.ativo) ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="mt-1"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <AvatarNome nome={l.nome} className="size-12" />

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {l.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={l.status} />
              <MarcadorBadge marcador={l.marcador} />
              {l.semCriterio && <SemCriterioBadge />}
              <Badge variant="muted">
                {rotuloOrigem[l.origem ?? "desconhecida"] ?? l.origem}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setDialogo("editar")}>
            <Pencil className="size-4" />
            Editar
          </Button>

          {permissoes.reatribuirLead(role) && (
            <Button variant="outline" onClick={() => setDialogo("reatribuir")}>
              <UserRoundCog className="size-4" />
              Reatribuir
            </Button>
          )}

          {!fechado && (
            <Button variant="brand" onClick={() => setDialogo("fechar")}>
              <Trophy className="size-4" />
              Fechar oportunidade
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Coluna principal ────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Mensagem original</CardTitle>
                <CardDescription>
                  O que o lead escreveu ao entrar em contato.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <blockquote className="border-primary/40 text-muted-foreground border-l-2 pl-4 text-sm leading-relaxed italic">
                “{l.mensagem}”
              </blockquote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Histórico</CardTitle>
                <CardDescription>
                  Toda a interação registrada com este lead.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="registrar">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="registrar">Registrar</TabsTrigger>
                  <TabsTrigger value="timeline">
                    Timeline
                    {timeline.data && (
                      <Badge variant="muted" className="ml-1">
                        {timeline.data.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="registrar">
                  <FormularioAtividade
                    onEnviar={(descricao, tipo) =>
                      adicionarAtividade.mutate({ descricao, tipo })
                    }
                    enviando={adicionarAtividade.isPending}
                  />
                </TabsContent>

                <TabsContent value="timeline">
                  {timeline.isPending ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="size-8 shrink-0 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Timeline eventos={timeline.data ?? []} />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── Barra lateral ───────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oportunidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs">Valor estimado</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatBRL(l.valorEstimado)}
                </p>
              </div>

              <Separator />

              <Campo rotulo="Consultor">
                {l.consultor ? (
                  <div className="flex items-center gap-2">
                    <AvatarNome nome={l.consultor.nome} className="size-6" />
                    <span className="truncate text-sm">{l.consultor.nome}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Não atribuído
                  </span>
                )}
              </Campo>

              <Campo rotulo="Sem movimentação">
                <span
                  className={
                    parado >= 3 && !fechado
                      ? "text-warning text-sm font-medium"
                      : "text-sm"
                  }
                >
                  {fechado ? "Encerrado" : `${parado} ${parado === 1 ? "dia" : "dias"}`}
                </span>
              </Campo>

              <Campo rotulo="Criado em">
                <span className="text-sm">{formatDateTime(l.createdAt)}</span>
              </Campo>

              {l.motivoPerda && (
                <Campo rotulo="Motivo da perda">
                  <span className="text-destructive text-sm">{l.motivoPerda}</span>
                </Campo>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href={`tel:${l.telefone}`}
                className="hover:bg-accent flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
              >
                <Phone className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-sm">{formatPhone(l.telefone)}</span>
              </a>

              {l.email && (
                <a
                  href={`mailto:${l.email}`}
                  className="hover:bg-accent flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                >
                  <Mail className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate text-sm">{l.email}</span>
                </a>
              )}

              <Separator className="my-2" />

              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setDialogo("email")}
                  disabled={!l.email}
                  title={!l.email ? "Este lead não tem e-mail cadastrado" : undefined}
                >
                  <Send className="size-4" />
                  Enviar e-mail
                </Button>

                <Button asChild variant="outline" className="justify-start">
                  <a
                    href={whatsappLink(
                      l.telefone,
                      `Olá ${l.nome.split(" ")[0]}, aqui é da Vyra.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      api.registrarWhatsapp(id, "Contato iniciado via WhatsApp")
                    }
                  >
                    <MessageCircle className="size-4" />
                    Abrir WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {l.semCriterio && (
            <Card className="border-warning/30 bg-warning/[0.06]">
              <CardContent className="flex gap-3 py-4">
                <Sparkles className="text-warning size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sem critério de atribuição</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    A IA não encontrou um consultor com perfil compatível. Atribua
                    manualmente ou ajuste os perfis da equipe.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Diálogos ──────────────────────────────────────── */}

      <DialogoFechar
        aberto={dialogo === "fechar"}
        onFechar={() => setDialogo(null)}
        valorAtual={l.valorEstimado}
        onConfirmar={(dados) => fechar.mutate(dados)}
        enviando={fechar.isPending}
      />

      <DialogoReatribuir
        aberto={dialogo === "reatribuir"}
        onFechar={() => setDialogo(null)}
        consultores={consultoresDisponiveis}
        atual={l.consultorId}
        onConfirmar={(consultorId) => reatribuir.mutate(consultorId)}
        enviando={reatribuir.isPending}
      />

      <DialogoEditar
        aberto={dialogo === "editar"}
        onFechar={() => setDialogo(null)}
        lead={l}
        onConfirmar={(dados) => editar.mutate(dados)}
        enviando={editar.isPending}
      />

      <DialogoEmail
        aberto={dialogo === "email"}
        onFechar={() => setDialogo(null)}
        nomeLead={l.nome}
        destinatario={l.email ?? ""}
        templates={templates.data?.filter((t) => t.tipo === "EMAIL" && t.ativo) ?? []}
        onConfirmar={(dados) => enviarEmail.mutate(dados)}
        enviando={enviarEmail.isPending}
      />
    </div>
  );
}

/* ── Blocos auxiliares ─────────────────────────────────────── */

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-xs">{rotulo}</span>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  );
}

function FormularioAtividade({
  onEnviar,
  enviando,
}: {
  onEnviar: (descricao: string, tipo: "ATIVIDADE" | "NOTA") => void;
  enviando: boolean;
}) {
  const [descricao, setDescricao] = React.useState("");
  const [tipo, setTipo] = React.useState<"ATIVIDADE" | "NOTA">("ATIVIDADE");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return;
    onEnviar(descricao.trim(), tipo);
    setDescricao("");
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descreva a ligação, reunião ou observação sobre este lead..."
        className="min-h-24"
      />
      <div className="flex items-center justify-between gap-3">
        <Select value={tipo} onValueChange={(v) => setTipo(v as "ATIVIDADE" | "NOTA")}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ATIVIDADE">Atividade</SelectItem>
            <SelectItem value="NOTA">Nota interna</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" loading={enviando} disabled={!descricao.trim()}>
          <Calendar className="size-4" />
          Registrar
        </Button>
      </div>
    </form>
  );
}

function DialogoFechar({
  aberto,
  onFechar,
  valorAtual,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  valorAtual: number | null;
  onConfirmar: (dados: {
    resultado: "GANHOU" | "PERDEU";
    motivoPerda?: string;
    valorFinal?: number;
  }) => void;
  enviando: boolean;
}) {
  const [resultado, setResultado] = React.useState<"GANHOU" | "PERDEU">("GANHOU");
  const [motivo, setMotivo] = React.useState("");
  const [valor, setValor] = React.useState(String(valorAtual ?? ""));

  React.useEffect(() => {
    if (aberto) {
      setResultado("GANHOU");
      setMotivo("");
      setValor(String(valorAtual ?? ""));
    }
  }, [aberto, valorAtual]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar oportunidade</DialogTitle>
          <DialogDescription>
            Registre o desfecho. Isso move o lead para a etapa final do funil.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setResultado("GANHOU")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
              resultado === "GANHOU"
                ? "border-success bg-success/10"
                : "border-border hover:bg-accent"
            }`}
          >
            <CheckCircle2
              className={`size-6 ${resultado === "GANHOU" ? "text-success" : "text-muted-foreground"}`}
            />
            <span className="text-sm font-medium">Ganhou</span>
          </button>

          <button
            type="button"
            onClick={() => setResultado("PERDEU")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
              resultado === "PERDEU"
                ? "border-destructive bg-destructive/10"
                : "border-border hover:bg-accent"
            }`}
          >
            <Ban
              className={`size-6 ${resultado === "PERDEU" ? "text-destructive" : "text-muted-foreground"}`}
            />
            <span className="text-sm font-medium">Perdeu</span>
          </button>
        </div>

        {resultado === "GANHOU" ? (
          <div className="space-y-2">
            <Label htmlFor="valor-final">Valor final fechado</Label>
            <Input
              id="valor-final"
              type="number"
              min={0}
              step={500}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da perda</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Preço acima do orçamento">
                  Preço acima do orçamento
                </SelectItem>
                <SelectItem value="Escolheu concorrente">
                  Escolheu concorrente
                </SelectItem>
                <SelectItem value="Projeto adiado">Projeto adiado</SelectItem>
                <SelectItem value="Sem retorno">Sem retorno</SelectItem>
                <SelectItem value="Fora do perfil">Fora do perfil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            variant={resultado === "GANHOU" ? "success" : "destructive"}
            loading={enviando}
            disabled={resultado === "PERDEU" && !motivo}
            onClick={() =>
              onConfirmar({
                resultado,
                ...(resultado === "PERDEU"
                  ? { motivoPerda: motivo }
                  : { valorFinal: Number(valor) || undefined }),
              })
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoReatribuir({
  aberto,
  onFechar,
  consultores,
  atual,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  consultores: { id: string; nome: string; perfilDescricao?: string | null }[];
  atual: string | null;
  onConfirmar: (consultorId: string) => void;
  enviando: boolean;
}) {
  const [selecionado, setSelecionado] = React.useState("");

  React.useEffect(() => {
    if (aberto) setSelecionado("");
  }, [aberto]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reatribuir lead</DialogTitle>
          <DialogDescription>
            Escolha o consultor que passará a ser responsável por esta
            oportunidade.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {consultores.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionado(c.id)}
              disabled={c.id === atual}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-40 ${
                selecionado === c.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent"
              }`}
            >
              <AvatarNome nome={c.nome} className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {c.nome}
                  {c.id === atual && (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      (atual)
                    </span>
                  )}
                </p>
                {c.perfilDescricao && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug">
                    {c.perfilDescricao}
                  </p>
                )}
              </div>
            </button>
          ))}

          {consultores.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum consultor ativo disponível.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            disabled={!selecionado}
            onClick={() => onConfirmar(selecionado)}
          >
            Reatribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEditar({
  aberto,
  onFechar,
  lead,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  lead: { nome: string; email: string | null; telefone: string; marcador: Marcador; valorEstimado: number | null };
  onConfirmar: (dados: {
    nome: string;
    email: string;
    telefone: string;
    marcador: Marcador;
    valorEstimado: number;
  }) => void;
  enviando: boolean;
}) {
  const [form, setForm] = React.useState({
    nome: lead.nome,
    email: lead.email ?? "",
    telefone: lead.telefone,
    marcador: lead.marcador,
    valorEstimado: String(lead.valorEstimado ?? ""),
  });

  // Reabrir o diálogo descarta edições não salvas.
  React.useEffect(() => {
    if (aberto) {
      setForm({
        nome: lead.nome,
        email: lead.email ?? "",
        telefone: lead.telefone,
        marcador: lead.marcador,
        valorEstimado: String(lead.valorEstimado ?? ""),
      });
    }
  }, [aberto, lead]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>
            Atualize os dados de contato e a qualificação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ed-nome">Nome</Label>
            <Input
              id="ed-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ed-email">E-mail</Label>
              <Input
                id="ed-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-tel">Telefone</Label>
              <Input
                id="ed-tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ed-marc">Temperatura</Label>
              <Select
                value={form.marcador}
                onValueChange={(v) => setForm({ ...form, marcador: v as Marcador })}
              >
                <SelectTrigger id="ed-marc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUENTE">Quente</SelectItem>
                  <SelectItem value="MORNO">Morno</SelectItem>
                  <SelectItem value="FRIO">Frio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-valor">Valor estimado</Label>
              <Input
                id="ed-valor"
                type="number"
                min={0}
                step={500}
                value={form.valorEstimado}
                onChange={(e) =>
                  setForm({ ...form, valorEstimado: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            onClick={() =>
              onConfirmar({
                ...form,
                valorEstimado: Number(form.valorEstimado) || 0,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEmail({
  aberto,
  onFechar,
  nomeLead,
  destinatario,
  templates,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  nomeLead: string;
  destinatario: string;
  templates: { id: string; nome: string; assunto: string | null; corpo: string }[];
  onConfirmar: (dados: { assunto: string; corpo: string }) => void;
  enviando: boolean;
}) {
  const [assunto, setAssunto] = React.useState("");
  const [corpo, setCorpo] = React.useState("");
  const usuario = useAuthStore((s) => s.usuario);

  React.useEffect(() => {
    if (aberto) {
      setAssunto("");
      setCorpo("");
    }
  }, [aberto]);

  /** Aplica o template já resolvendo os placeholders conhecidos. */
  function aplicarTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const valores = {
      nome: nomeLead.split(" ")[0],
      consultor: usuario?.nome ?? "",
      empresa: "sua empresa",
    };
    setAssunto(interpolate(t.assunto ?? "", valores));
    setCorpo(interpolate(t.corpo, valores));
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar e-mail</DialogTitle>
          <DialogDescription>Para {destinatario}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Usar um template</Label>
              <Select onValueChange={aplicarTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modelo pronto" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="em-assunto">Assunto</Label>
            <Input
              id="em-assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Assunto do e-mail"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="em-corpo">Mensagem</Label>
            <Textarea
              id="em-corpo"
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              placeholder="Escreva a mensagem..."
              className="min-h-48"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            disabled={!assunto.trim() || !corpo.trim()}
            onClick={() => onConfirmar({ assunto, corpo })}
          >
            <Send className="size-4" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
