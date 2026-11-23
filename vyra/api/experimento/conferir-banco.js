// Confere o banco ANTES de enviar um conjunto. Só lê, não muda nada.
//
// Uso (no servidor, depois do seed):
//   docker exec -e CONJUNTO=leads-medico vyra_api node experimento/conferir-banco.js
//
// 1. Cada consultor do conjunto existe, está ativo, tem o perfil igual ao do conjunto e tem vetor.
// 2. Nenhum outro consultor ativo com vetor disputa os leads (ele entraria na escolha da IA
//    e o acerto cairia por um motivo que não é do experimento).
// 3. Nenhum telefone ou e-mail do conjunto já está no banco (o worker juntaria os dois leads).
import { PrismaClient } from '@prisma/client'
import { NOME, lerConjunto } from './conjunto.js'

const conjunto = await lerConjunto()
const prisma = new PrismaClient()
const problemas = []
const avisos = []
const digitos = (telefone) => String(telefone ?? '').replace(/\D/g, '').slice(-11)

try {
  console.log(`Conjunto: ${NOME}.json\n`)

  // 1. Consultores do conjunto
  const emails = Object.keys(conjunto.consultores)
  const usuarios = await prisma.usuario.findMany({
    where: { email: { in: emails } },
    select: { email: true, role: true, ativo: true, perfilDescricao: true, vetorPerfil: true },
  })
  const porEmail = new Map(usuarios.map((u) => [u.email, u]))
  for (const email of emails) {
    const u = porEmail.get(email)
    let situacao = 'OK'
    if (!u) situacao = 'não existe no banco (rode o seed)'
    else if (u.role !== 'CONSULTOR') situacao = `papel é ${u.role}, não CONSULTOR`
    else if (!u.ativo) situacao = 'está desativado'
    else if (u.perfilDescricao !== conjunto.consultores[email]) situacao = 'perfil diferente do conjunto (rode o seed de novo)'
    else if (!u.vetorPerfil.length) situacao = 'sem vetor de perfil (rode o seed de novo)'
    if (situacao !== 'OK') problemas.push(`${email}: ${situacao}`)
    console.log(`${situacao === 'OK' ? '✅' : '❌'} ${email.padEnd(20)} ${situacao === 'OK' ? `vetor de ${u.vetorPerfil.length}d` : situacao}`)
  }

  // 2. Outros consultores que também receberiam leads
  const intrusos = await prisma.usuario.findMany({
    where: { role: 'CONSULTOR', ativo: true, email: { notIn: emails }, NOT: { vetorPerfil: { equals: [] } } },
    select: { email: true, nome: true },
  })
  for (const u of intrusos) {
    avisos.push(`${u.nome} (${u.email}) é consultor ativo com vetor e vai disputar os leads com os ${emails.length} do conjunto.`)
  }

  // 3. Telefones e e-mails do conjunto que já estão no banco
  const leads = await prisma.lead.findMany({ select: { telefone: true, email: true } })
  const telefonesBanco = new Set(leads.map((l) => digitos(l.telefone)))
  const emailsBanco = new Set(leads.filter((l) => l.email).map((l) => l.email.toLowerCase()))
  const repetidos = conjunto.leads.filter(
    (l) => telefonesBanco.has(digitos(l.lead.telefone)) || (l.lead.email && emailsBanco.has(l.lead.email.toLowerCase()))
  )
  if (repetidos.length) {
    problemas.push(`${repetidos.length} lead(s) do conjunto já têm telefone ou e-mail no banco: ${repetidos.map((l) => l.id).join(', ')}`)
  }
  console.log(`\nLeads no banco: ${leads.length}. Do conjunto com telefone ou e-mail já no banco: ${repetidos.length}.`)
} finally {
  await prisma.$disconnect()
}

for (const a of avisos) console.log(`⚠️  ${a}`)
if (problemas.length) {
  console.log(`\n❌ Não envie ainda. ${problemas.length} problema(s):`)
  for (const p of problemas) console.log(`  - ${p}`)
  process.exit(1)
}
console.log(avisos.length ? '\n⚠️  Banco OK, mas leia os avisos antes de enviar.' : '\n✅ Banco pronto para o envio.')
