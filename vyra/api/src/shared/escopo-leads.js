import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Monta o filtro `where` de leads conforme o papel do usuário.
 *
 * CONSULTOR  → apenas os leads atribuídos a ele
 * GERENTE    → os leads dos consultores da sua equipe + a repescagem (leads sem consultor)
 * ADMIN      → tudo, sem filtro
 *
 * Usado pela listagem, pelo Kanban, pelos leads ociosos e pelas métricas, para
 * que todas as telas respeitem o mesmo escopo.
 *
 * O filtro do gerente vem dentro de um AND: assim quem usar `{ ...escopo, OR: [...] }`
 * não apaga, sem perceber, a regra de escopo.
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
    return {
      AND: [
        {
          OR: [
            { consultorId: { in: consultores.map((c) => c.id) } },
            // Repescagem ainda não tem consultor: o gerente precisa ver para revisar
            { status: 'REPESCAGEM', consultorId: null },
          ],
        },
      ],
    }
  }

  return {}
}

/**
 * Confere se o usuário pode abrir ou alterar UM lead específico. Lança 403 se não puder.
 * É a mesma regra do escopoLeads, aplicada a um lead já carregado.
 */
export async function garantirAcessoAoLead(lead, usuario) {
  if (usuario.role === 'ADMIN') return

  if (usuario.role === 'CONSULTOR' && lead.consultorId === usuario.id) return

  if (usuario.role === 'GERENTE') {
    if (lead.status === 'REPESCAGEM' && !lead.consultorId) return
    if (lead.consultorId) {
      const consultor = await prisma.usuario.findUnique({
        where: { id: lead.consultorId },
        select: { gerenteId: true },
      })
      if (consultor?.gerenteId === usuario.id) return
    }
  }

  throw { statusCode: 403, message: 'Acesso negado' }
}
