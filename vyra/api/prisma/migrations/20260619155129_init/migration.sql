-- CreateEnum
CREATE TYPE "TipoTemplate" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoTemplate" NOT NULL,
    "assunto" TEXT,
    "corpo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);
