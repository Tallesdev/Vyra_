import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O repositório tem um package-lock.json no diretório acima (vyra/), o que faz
  // o Turbopack inferir a raiz errada. Fixamos a raiz nesta pasta.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
