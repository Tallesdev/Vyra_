"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/app-shell";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { permissoes, useAuthStore } from "@/stores/auth-store";
import type { TipoTemplate } from "@/lib/types";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.usuario?.role);
  const podeGerenciar = permissoes.gerenciarTemplates(role);

  const [filtro, setFiltro] = React.useState<TipoTemplate | "TODOS">("TODOS");
  const [criando, setCriando] = React.useState(false);

  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.listarTemplates(),
  });

  const criar = useMutation({
    mutationFn: api.criarTemplate,
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setCriando(false);
      toast.success(`Template “${t.nome}” criado.`);
    },
    onError: () => toast.error("Não foi possível criar o template."),
  });

  const visiveis =
    templates.data?.filter((t) => filtro === "TODOS" || t.tipo === filtro) ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        titulo="Templates"
        descricao="Modelos de e-mail e WhatsApp com variáveis reutilizáveis."
        acoes={
          podeGerenciar && (
            <Button variant="brand" onClick={() => setCriando(true)}>
              <Plus className="size-4" />
              Novo template
            </Button>
          )
        }
      />

      <Tabs
        value={filtro}
        onValueChange={(v) => setFiltro(v as TipoTemplate | "TODOS")}
      >
        <TabsList>
          <TabsTrigger value="TODOS">Todos</TabsTrigger>
          <TabsTrigger value="EMAIL">
            <Mail /> E-mail
          </TabsTrigger>
          <TabsTrigger value="WHATSAPP">
            <MessageCircle /> WhatsApp
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {templates.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            titulo="Nenhum template encontrado"
            descricao="Crie modelos para agilizar o primeiro contato e os follow-ups."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((t) => (
            <Card key={t.id} className={t.ativo ? "" : "opacity-60"}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.nome}</p>
                    {t.assunto && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {t.assunto}
                      </p>
                    )}
                  </div>
                  <Badge variant={t.tipo === "EMAIL" ? "info" : "success"}>
                    {t.tipo === "EMAIL" ? <Mail /> : <MessageCircle />}
                    {t.tipo === "EMAIL" ? "E-mail" : "WhatsApp"}
                  </Badge>
                </div>

                <pre className="bg-muted/50 text-muted-foreground mt-4 flex-1 overflow-hidden rounded-lg p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {t.corpo.length > 220 ? `${t.corpo.slice(0, 220)}...` : t.corpo}
                </pre>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground text-xs">
                    {formatDate(t.criadoEm)}
                  </span>
                  {!t.ativo && <Badge variant="muted">Inativo</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/40">
        <CardContent className="py-4">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Use <code className="text-foreground">{"{{nome}}"}</code>,{" "}
            <code className="text-foreground">{"{{consultor}}"}</code> e{" "}
            <code className="text-foreground">{"{{empresa}}"}</code> no corpo —
            os valores são substituídos no momento do envio.
          </p>
        </CardContent>
      </Card>

      <DialogoNovoTemplate
        aberto={criando}
        onFechar={() => setCriando(false)}
        onConfirmar={(dados) => criar.mutate(dados)}
        enviando={criar.isPending}
      />
    </div>
  );
}

function DialogoNovoTemplate({
  aberto,
  onFechar,
  onConfirmar,
  enviando,
}: {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (dados: {
    nome: string;
    tipo: TipoTemplate;
    assunto: string | null;
    corpo: string;
  }) => void;
  enviando: boolean;
}) {
  const [nome, setNome] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoTemplate>("EMAIL");
  const [assunto, setAssunto] = React.useState("");
  const [corpo, setCorpo] = React.useState("");

  React.useEffect(() => {
    if (aberto) {
      setNome("");
      setTipo("EMAIL");
      setAssunto("");
      setCorpo("");
    }
  }, [aberto]);

  // E-mail exige assunto; WhatsApp não tem esse campo.
  const valido =
    nome.trim() && corpo.trim() && (tipo === "WHATSAPP" || assunto.trim());

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo template</DialogTitle>
          <DialogDescription>
            Modelos aceleram o contato e mantêm o tom da equipe consistente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nt-nome">Nome do template</Label>
              <Input
                id="nt-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Follow-up de proposta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt-tipo">Canal</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoTemplate)}
              >
                <SelectTrigger id="nt-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {tipo === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="nt-assunto">Assunto</Label>
              <Input
                id="nt-assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="{{nome}}, conseguiu avaliar a proposta?"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nt-corpo">Corpo da mensagem</Label>
            <Textarea
              id="nt-corpo"
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              placeholder={"Olá {{nome}},\n\n..."}
              className="min-h-48"
            />
            <p className="text-muted-foreground text-xs">
              Variáveis disponíveis: {"{{nome}}"}, {"{{consultor}}"}, {"{{empresa}}"}
            </p>
          </div>
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
                nome,
                tipo,
                assunto: tipo === "EMAIL" ? assunto : null,
                corpo,
              })
            }
          >
            Criar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
