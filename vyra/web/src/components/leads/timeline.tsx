import {
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  Move,
  Phone,
  Sparkles,
  StickyNote,
  UserPlus,
} from "lucide-react";

import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { EventoTimeline } from "@/lib/types";

const config: Record<
  EventoTimeline["tipo"],
  { icone: typeof Mail; classe: string }
> = {
  CRIACAO: { icone: UserPlus, classe: "bg-primary/12 text-primary" },
  ATRIBUICAO: { icone: Sparkles, classe: "bg-primary/12 text-primary" },
  MOVIMENTACAO: { icone: Move, classe: "bg-info/12 text-info" },
  ATIVIDADE: { icone: Phone, classe: "bg-muted text-muted-foreground" },
  NOTA: { icone: StickyNote, classe: "bg-muted text-muted-foreground" },
  PROPOSTA: { icone: FileText, classe: "bg-warning/15 text-warning" },
  EMAIL: { icone: Mail, classe: "bg-info/12 text-info" },
  WHATSAPP: { icone: MessageCircle, classe: "bg-success/12 text-success" },
  FECHAMENTO: { icone: CheckCircle2, classe: "bg-success/12 text-success" },
  REATRIBUICAO: { icone: ArrowRightLeft, classe: "bg-warning/15 text-warning" },
};

export function Timeline({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <ol className="relative space-y-1">
      {eventos.map((evento, i) => {
        // A API pode enviar um tipo fora do mapa (o enum do Mongo evolui);
        // nesse caso cai no visual neutro de atividade em vez de quebrar.
        const { icone: Icone, classe } = config[evento.tipo] ?? config.ATIVIDADE;
        const ultimo = i === eventos.length - 1;

        return (
          <li key={evento.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Linha vertical conectando os eventos */}
            {!ultimo && (
              <span
                aria-hidden
                className="bg-border absolute top-8 left-4 h-[calc(100%-1rem)] w-px"
              />
            )}

            <div
              className={cn(
                "relative grid size-8 shrink-0 place-items-center rounded-full",
                classe,
              )}
            >
              <Icone className="size-4" />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug">{evento.descricao}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {evento.autor} ·{" "}
                <span title={formatDateTime(evento.criadoEm)}>
                  {timeAgo(evento.criadoEm)}
                </span>
              </p>

              {/* Detalhes adicionais do evento, quando houver */}
              {evento.tipo === "EMAIL" && evento.metadata?.assunto ? (
                <p className="text-muted-foreground bg-muted/60 mt-2 rounded-md px-2.5 py-1.5 text-xs">
                  Assunto: {String(evento.metadata.assunto)}
                </p>
              ) : null}
              {evento.tipo === "WHATSAPP" && evento.metadata?.mensagem ? (
                <p className="text-muted-foreground bg-muted/60 mt-2 line-clamp-3 rounded-md px-2.5 py-1.5 text-xs">
                  {String(evento.metadata.mensagem)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
