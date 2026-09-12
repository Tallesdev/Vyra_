import Link from "next/link";

import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-glow grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <LogoMark className="mx-auto size-12" />
        <p className="text-muted-foreground mt-6 text-sm font-medium tracking-widest uppercase">
          Erro 404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm text-balance">
          O endereço que você tentou abrir não existe ou foi movido.
        </p>
        <Button asChild variant="brand" className="mt-6">
          <Link href="/dashboard">Voltar ao dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
