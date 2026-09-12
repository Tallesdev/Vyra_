"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { rotuloOrigem } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { DistribuicaoOrigem, SerieTemporal } from "@/lib/types";

/* Cores das séries — lidas dos tokens do tema para seguir claro/escuro. */
const CORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const eixo = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

/** Tooltip com a mesma superfície dos popovers do design system. */
function CaixaTooltip({
  active,
  payload,
  label,
  formatarRotulo,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  formatarRotulo?: (valor: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover rounded-lg border px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1.5 text-xs font-medium">
          {formatarRotulo ? formatarRotulo(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-muted-foreground capitalize">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Evolução diária de leads novos, ganhos e perdidos. */
export function GraficoSerie({ dados }: { dados: SerieTemporal[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          {["novos", "ganhos", "perdidos"].map((chave, i) => (
            <linearGradient
              key={chave}
              id={`grad-${chave}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={CORES[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CORES[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="data"
          {...eixo}
          tickFormatter={(v: string) => formatDate(v)}
          minTickGap={28}
        />
        <YAxis {...eixo} allowDecimals={false} width={36} />
        <Tooltip
          content={<CaixaTooltip formatarRotulo={(v) => formatDate(v)} />}
          cursor={{ stroke: "var(--border)" }}
        />

        <Area
          type="monotone"
          dataKey="novos"
          name="Novos"
          stroke={CORES[0]}
          strokeWidth={2}
          fill="url(#grad-novos)"
        />
        <Area
          type="monotone"
          dataKey="ganhos"
          name="Ganhos"
          stroke={CORES[2]}
          strokeWidth={2}
          fill="url(#grad-ganhos)"
        />
        <Area
          type="monotone"
          dataKey="perdidos"
          name="Perdidos"
          stroke={CORES[4]}
          strokeWidth={2}
          fill="url(#grad-perdidos)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** De onde vêm os leads — rosca com legenda ao lado. */
export function GraficoOrigens({ dados }: { dados: DistribuicaoOrigem[] }) {
  const total = dados.reduce((s, d) => s + d.total, 0);
  const comRotulo = dados.map((d) => ({
    ...d,
    nome: rotuloOrigem[d.origem] ?? d.origem,
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={180} className="max-w-[180px]">
        <PieChart>
          <Pie
            data={comRotulo}
            dataKey="total"
            nameKey="nome"
            innerRadius={48}
            outerRadius={76}
            paddingAngle={2}
            strokeWidth={0}
          >
            {comRotulo.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>
          <Tooltip content={<CaixaTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="grid w-full flex-1 gap-2">
        {comRotulo.map((d, i) => (
          <li key={d.origem} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: CORES[i % CORES.length] }}
            />
            <span className="truncate">{d.nome}</span>
            <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
              {d.total}
              <span className="ml-1.5 text-xs">
                ({Math.round((d.total / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Quantos leads existem em cada etapa aberta do funil. */
export function GraficoFunil({
  dados,
}: {
  dados: { etapa: string; total: number; cor: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 44)}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
        barSize={22}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis type="number" {...eixo} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="etapa"
          {...eixo}
          width={110}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <Tooltip content={<CaixaTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" name="Leads" radius={[0, 6, 6, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
