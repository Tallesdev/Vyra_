import { cn } from "@/lib/utils";

/**
 * Marca Vyra: um "V" desenhado como funil de vendas — duas diagonais
 * convergindo para um ponto, com a faísca da IA no vértice.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" fill="url(#vyra-g)" />
      <path
        d="M9 10.5 L16 21 L23 10.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <circle cx="16" cy="23.5" r="1.9" fill="white" />
      <defs>
        <linearGradient id="vyra-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <div className="leading-none">
          <span className="text-lg font-semibold tracking-tight">Vyra</span>
          <span className="text-muted-foreground ml-1 text-[10px] font-medium tracking-widest uppercase">
            CRM
          </span>
        </div>
      )}
    </div>
  );
}
