"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { LogoMark } from "@/components/logo";
import { useAuthStore } from "@/stores/auth-store";

/** Porta de entrada: manda para o dashboard ou para o login. */
export default function Home() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const hidratado = useAuthStore((s) => s.hidratado);

  React.useEffect(() => {
    if (!hidratado) return;
    router.replace(usuario ? "/dashboard" : "/login");
  }, [hidratado, usuario, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}
