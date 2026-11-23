// Confere um conjunto de leads ANTES de enviar qualquer coisa. Não usa o banco nem a IA.
//
// Uso (no PC ou no servidor):
//   node experimento/validar-conjunto.js                          -> leads.json
//   CONJUNTO=leads-medico node experimento/validar-conjunto.js    -> leads-medico.json
//   (no servidor: docker exec -e CONJUNTO=leads-medico vyra_api node experimento/validar-conjunto.js)
//
// 1. Estrutura: quantidades por grupo e por consultor, IDs, telefones e e-mails únicos,
//    nenhum telefone ou e-mail em comum com os outros conjuntos da pasta (o worker juntaria
//    os dois leads num só) e todo consultor aceito existente em "consultores".
// 2. Linha de base de palavras-chave (a mesma do relatório) sobre o gabarito.
//    Se os leigos acertarem muito, eles estão repetindo palavras do perfil.
import { readdir, readFile } from 'node:fs/promises'
import { NOME, lerConjunto } from './conjunto.js'
import { criarClassificadorPorPalavras, palavras } from './palavras-chave.js'

const conjunto = await lerConjunto()
const consultores = Object.keys(conjunto.consultores)
const erros = []
const digitos = (telefone) => String(telefone ?? '').replace(/\D/g, '').slice(-11)
const pct = (parte, total) => (total ? `${((100 * parte) / total).toFixed(1).replace('.', ',')}%` : '-')

// ─── 1. Estrutura ─────────────────────────────────────────────────────────────

function repetidos(lista) {
  const vistos = new Set()
  return [...new Set(lista.filter((v) => vistos.has(v) || !vistos.add(v)))]
}

const leads = conjunto.leads
const telefones = leads.map((l) => digitos(l.lead.telefone))
const emails = leads.filter((l) => l.lead.email).map((l) => l.lead.email.toLowerCase())

for (const [rotulo, lista] of [['ID', leads.map((l) => l.id)], ['Telefone', telefones], ['E-mail', emails]]) {
  const r = repetidos(lista)
  if (r.length) erros.push(`${rotulo} repetido: ${r.join(', ')}`)
}

for (const l of leads) {
  const esperadoAceitos = { claro: 1, ambiguo: 2, ruim: 0 }[l.grupo]
  if (esperadoAceitos === undefined) erros.push(`${l.id}: grupo desconhecido "${l.grupo}"`)
  else if (l.consultoresAceitos.length !== esperadoAceitos) erros.push(`${l.id}: ${l.grupo} precisa de ${esperadoAceitos} consultor(es) aceito(s)`)
  const esperado = l.grupo === 'ruim' ? 'barrado' : 'aprovado'
  if (l.resultadoEsperado !== esperado) erros.push(`${l.id}: resultadoEsperado deveria ser "${esperado}"`)
  for (const email of l.consultoresAceitos) {
    if (!consultores.includes(email)) erros.push(`${l.id}: consultor aceito ${email} não está em "consultores"`)
  }
  if (digitos(l.lead.telefone).length !== 11) erros.push(`${l.id}: telefone não tem 11 dígitos (DDD + número)`)
}

// Nenhum telefone ou e-mail em comum com os outros conjuntos da pasta
const outros = (await readdir(new URL('./', import.meta.url))).filter((a) => /^leads.*\.json$/.test(a) && a !== `${NOME}.json`)
for (const arquivo of outros) {
  const outro = JSON.parse(await readFile(new URL(`./${arquivo}`, import.meta.url), 'utf8'))
  const telOutro = new Set(outro.leads.map((l) => digitos(l.lead.telefone)))
  const emailOutro = new Set(outro.leads.filter((l) => l.lead.email).map((l) => l.lead.email.toLowerCase()))
  const tel = telefones.filter((t) => telOutro.has(t))
  const mail = emails.filter((e) => emailOutro.has(e))
  if (tel.length) erros.push(`Telefones em comum com ${arquivo}: ${tel.join(', ')}`)
  if (mail.length) erros.push(`E-mails em comum com ${arquivo}: ${mail.join(', ')}`)
}

const contar = (filtro) => leads.filter(filtro).length
console.log(`Conjunto: ${NOME}.json`)
console.log(`Leads: ${leads.length} | claros: ${contar((l) => l.grupo === 'claro')} | ambíguos: ${contar((l) => l.grupo === 'ambiguo')} | ruins: ${contar((l) => l.grupo === 'ruim')}`)
console.log(`Consultores: ${consultores.length}. Comparado com: ${outros.join(', ') || 'nenhum outro conjunto'}`)
console.log('\nClaros por consultor (técnico / leigo):')
for (const email of consultores) {
  const doConsultor = leads.filter((l) => l.grupo === 'claro' && l.consultoresAceitos[0] === email)
  const t = doConsultor.filter((l) => l.variante === 'tecnico').length
  console.log(`  ${email.padEnd(20)} ${String(t).padStart(2)} / ${doConsultor.length - t}`)
}
const variantesRuins = {}
for (const l of leads.filter((l) => l.grupo === 'ruim')) variantesRuins[l.variante] = (variantesRuins[l.variante] ?? 0) + 1
console.log(`\nRuins por tipo: ${Object.entries(variantesRuins).map(([v, n]) => `${v} ${n}`).join(', ')}`)
const pares = {}
for (const l of leads.filter((l) => l.grupo === 'ambiguo')) pares[l.variante] = (pares[l.variante] ?? 0) + 1
console.log(`Ambíguos por par: ${Object.entries(pares).map(([v, n]) => `${v} ${n}`).join(', ')}`)

// ─── 2. Linha de base de palavras-chave ───────────────────────────────────────

const classificador = criarClassificadorPorPalavras(conjunto.consultores)
const perfis = Object.fromEntries(Object.entries(conjunto.consultores).map(([email, texto]) => [email, palavras(texto)]))

function avaliar(grupo) {
  let estrito = 0
  let sorteio = 0
  for (const l of grupo) {
    const empatados = classificador.empatados(l.lead.mensagem)
    if (empatados.length === 1 && l.consultoresAceitos.includes(empatados[0])) estrito++
    sorteio += empatados.filter((e) => l.consultoresAceitos.includes(e)).length / empatados.length
  }
  return `estrito ${pct(estrito, grupo.length)} (${estrito} de ${grupo.length}) | sorteio nos empates ${pct(sorteio, grupo.length)}`
}

const claros = leads.filter((l) => l.grupo === 'claro')
console.log('\nLinha de base de palavras-chave (sobre o gabarito, sem enviar nada):')
console.log(`  Claros:   ${avaliar(claros)}`)
console.log(`  Técnicos: ${avaliar(claros.filter((l) => l.variante === 'tecnico'))}`)
console.log(`  Leigos:   ${avaliar(claros.filter((l) => l.variante === 'leigo'))}`)
console.log(`  Ambíguos: ${avaliar(leads.filter((l) => l.grupo === 'ambiguo'))}`)
console.log(`  Aleatório: claros ${pct(1, consultores.length)} | ambíguos ${pct(2, consultores.length)}`)

// Leigos que usam palavras do perfil do próprio consultor: candidatos a reescrever
const leigosComPalavras = claros
  .filter((l) => l.variante === 'leigo')
  .map((l) => ({ id: l.id, comuns: [...palavras(l.lead.mensagem)].filter((p) => perfis[l.consultoresAceitos[0]].has(p)) }))
  .filter((l) => l.comuns.length)
console.log(`\nLeigos com palavras do perfil do próprio consultor: ${leigosComPalavras.length}`)
for (const l of leigosComPalavras) console.log(`  ${l.id}: ${l.comuns.join(', ')}`)

if (erros.length) {
  console.log(`\n❌ ${erros.length} problema(s):`)
  for (const e of erros) console.log(`  - ${e}`)
  process.exit(1)
}
console.log('\n✅ Estrutura OK')
