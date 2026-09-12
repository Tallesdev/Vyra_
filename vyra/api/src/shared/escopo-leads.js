import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Monta o filtro `where` de leads conforme o papel do usuário.
 *
 * CONSULTOR  → apenas os leads atribuídos a ele
 * GERENTE    → os leads dos consultores da sua equipe
 * ADMIN      → tudo, sem filtro
 *
 * Extraído de leads.service.js para ser reaproveitado pelas métricas,
 * garantindo que o dashboard respeite o mesmo escopo da listagem.
 */
export async function escopoLeads(usuario) {
  if (usuario.role === 'CONSULTOR') {
    return { consultorId: usuario.id }
  }

  if (usuario.role === 'GERENTE') {
    const consultores = await prisma.usuario.findMany({
      where: { gerenteId: usuario.id },
      select: { id: true },
    })
    return { consultorId: { in: consultores.map((c) => c.id) } }
  }

  return {}
}
