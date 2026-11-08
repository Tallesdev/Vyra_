import { cn } from "@/lib/utils";

/**
 * Marca Vyra: um "V" desenhado como funil de vendas — duas diagonais
 * convergindo para um ponto, com a faísca da IA no vértice.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 513 415"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-auto", className)}
    >
      <path
        d="M506.02 3.35834H433.546C407.648 3.35834 384.058 18.2469 372.915 41.6242L256.02 286.858L135.917 41.0396C124.651 17.9816 101.231 3.35834 75.5679 3.35834H6.01968L256.02 408.358L506.02 3.35834Z"
        fill="url(#vyra-g1)"
        stroke="url(#vyra-g2)"
        strokeWidth="6.71667"
      />
      <path
        d="M253.641 222.172L256.682 228.453L259.693 222.157L332.756 69.3652L256.643 283.631L179.328 68.7294L253.641 222.172Z"
        stroke="url(#vyra-g3)"
        strokeWidth="6.71667"
      />
      <defs>
        <linearGradient id="vyra-g1" x1="256.02" y1="23.6083" x2="256.02" y2="408.358" gradientUnits="userSpaceOnUse">
          <stop offset="0.100962" stopColor="#BA4BBA" />
          <stop offset="0.826923" stopColor="#542254" />
        </linearGradient>
        <linearGradient id="vyra-g2" x1="256.02" y1="3.35834" x2="256.02" y2="408.358" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BA4BBA" />
          <stop offset="0.966346" stopColor="#542254" />
        </linearGradient>
        <linearGradient id="vyra-g3" x1="252.641" y1="10.1083" x2="252.641" y2="293.608" gradientUnits="userSpaceOnUse">
          <stop offset="0.5625" stopColor="#833183" />
          <stop offset="0.894231" stopColor="#542254" />
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
