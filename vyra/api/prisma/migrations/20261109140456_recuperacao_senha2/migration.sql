/*
  Warnings:

  - A unique constraint covering the columns `[tokenRecuperacaoHash]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "tokenRecuperacaoExpira" TIMESTAMP(3),
ADD COLUMN     "tokenRecuperacaoHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenRecuperacaoHash_key" ON "usuarios"("tokenRecuperacaoHash");
