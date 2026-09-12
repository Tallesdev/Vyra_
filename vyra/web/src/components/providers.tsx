"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Um client novo por render de servidor; um único client reaproveitado no browser.
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000 } },
    });
  }
  browserQueryClient ??= new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
  return browserQueryClient;
}

/** Os toasts precisam seguir o tema atual, por isso ficam dentro do provider. */
function ToasterTematizado() {
  const { resolvido } = useTheme();
  return (
    <Toaster
      theme={resolvido}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ style: { borderRadius: "0.75rem" } }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          {children}
          <ToasterTematizado />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
