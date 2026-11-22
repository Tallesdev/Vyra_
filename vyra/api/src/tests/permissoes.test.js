import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { escopoLeads, garantirAcessoAoLead } from '../shared/escopo-leads.js'
import { limparBanco, prisma } from './setup.js'

// Cenário: duas equipes, cada uma com um gerente e um consultor, mais um lead na repescagem.
let admin, gerente1, gerente2, consultor1, consultor2
let leadEquipe1, leadEquipe2, leadRepescagem

const usuario = (dados) => prisma.usuario.create({ data: { senha: 'nao-usada', ...dados } })
const lead = (dados) => prisma.lead.create({ data: { telefone: '11900000000', mensagem: 'Quero um orçamento', ...dados } })
const idsVisiveis = async (quem) =>
  (await prisma.lead.findMany({ where: await escopoLeads(quem), select: { id: true } })).map((l) => l.id).sort()

beforeAll(async () => {
  await limparBanco()
  admin = await usuario({ nome: 'Admin', email: 'perm.admin@vyra.com', role: 'ADMIN' })
  gerente1 = await usuario({ nome: 'Gerente 1', email: 'perm.g1@vyra.com', role: 'GERENTE' })
  gerente2 = await usuario({ nome: 'Gerente 2', email: 'perm.g2@vyra.com', role: 'GERENTE' })
  consultor1 = await usuario({ nome: 'Consultor 1', email: 'perm.c1@vyra.com', role: 'CONSULTOR', gerenteId: gerente1.id })
  consultor2 = await usuario({ nome: 'Consultor 2', email: 'perm.c2@vyra.com', role: 'CONSULTOR', gerenteId: gerente2.id })

  leadEquipe1 = await lead({ nome: 'Lead da equipe 1', consultorId: consultor1.id })
  leadEquipe2 = await lead({ nome: 'Lead da equipe 2', consultorId: consultor2.id })
  leadRepescagem = await lead({ nome: 'Lead na repescagem', status: 'REPESCAGEM' })
})

afterAll(async () => {
  await limparBanco()
  await prisma.$disconnect()
})

describe('Permissões por perfil', () => {
  it('consultor vê e abre só os próprios leads', async () => {
    expect(await idsVisiveis(consultor1)).toEqual([leadEquipe1.id])
    await expect(garantirAcessoAoLead(leadEquipe1, consultor1)).resolves.toBeUndefined()
    await expect(garantirAcessoAoLead(leadEquipe2, consultor1)).rejects.toMatchObject({ statusCode: 403 })
    await expect(garantirAcessoAoLead(leadRepescagem, consultor1)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('gerente vê a própria equipe e a repescagem, mas não a outra equipe', async () => {
    expect(await idsVisiveis(gerente1)).toEqual([leadEquipe1.id, leadRepescagem.id].sort())
    await expect(garantirAcessoAoLead(leadEquipe1, gerente1)).resolves.toBeUndefined()
    await expect(garantirAcessoAoLead(leadRepescagem, gerente1)).resolves.toBeUndefined()
    await expect(garantirAcessoAoLead(leadEquipe2, gerente1)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('admin vê e abre todos os leads', async () => {
    expect(await idsVisiveis(admin)).toEqual([leadEquipe1.id, leadEquipe2.id, leadRepescagem.id].sort())
    await expect(garantirAcessoAoLead(leadEquipe2, admin)).resolves.toBeUndefined()
  })

  it('o escopo do gerente continua valendo quando a consulta tem outro OR', async () => {
    const ontem = new Date(Date.now() - 86400000)
    const visiveis = await prisma.lead.findMany({
      where: { ...(await escopoLeads(gerente1)), OR: [{ createdAt: { gte: ontem } }, { ultimaMovimentacao: { gte: ontem } }] },
      select: { id: true },
    })
    expect(visiveis.map((l) => l.id)).not.toContain(leadEquipe2.id)
  })
})
