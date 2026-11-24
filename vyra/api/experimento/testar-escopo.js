// Testa a triagem da Camada 2 com a regra de escopo SEM gravar nada no banco:
// só chama a classificarLead para cada lead do conjunto e compara com o gabarito.
// Não usa Postgres, Redis nem o webhook. Precisa apenas da GEMINI_API_KEY.
//
// Uso (no PC, dentro de vyra/api):
//   $env:CONJUNTO="leads-medico"; node --env-file=.env experimento/testar-escopo.js        -> os 220 leads
//   $env:CONJUNTO="leads-medico"; node --env-file=.env experimento/testar-escopo.js ruim   -> só um grupo (claro, ambiguo ou ruim)
//   $env:SEM_ESCOPO="1"  antes do comando                                                -> prompt antigo, para comparar
//
// Grava a tabela em experimento/resultados/<conjunto>/teste-escopo.csv (pasta fora do Git).
import { writeFile, mkdir } from 'node:fs/promises'
import { classificarLead } from '../src/modules/leads/leads.ia.js'
import { NOME, PASTA, PASTA_TEXTO, lerConjunto } from './conjunto.js'

const INTERVALO_MS = Number(process.env.INTERVALO_MS ?? 4000)
const SEM_ESCOPO = process.env.SEM_ESCOPO === '1'
const GRUPO = process.argv[2] ?? null
const TENTATIVAS = 3

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY não definida. Rode com: node --env-file=.env experimento/testar-escopo.js')
  process.exit(1)
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

const conjunto = await lerConjunto()
// Mesmo escopo que o worker monta em produção: um perfil de consultor por linha
const escopo = SEM_ESCOPO ? '' : Object.values(conjunto.consultores).map((perfil) => `- ${perfil}`).join('\n')
// IDS=ANA-T01,BRU-L02 roda só esses leads (útil para repetir os que falharam)
const IDS = process.env.IDS ? process.env.IDS.split(',').map((id) => id.trim()) : null
const leads = conjunto.leads.filter((l) => (!GRUPO || l.grupo === GRUPO) && (!IDS || IDS.includes(l.id)))

if (leads.length === 0) {
  console.error(`Nenhum lead no grupo "${GRUPO}". Use claro, ambiguo ou ruim.`)
  process.exit(1)
}

console.log(`Conjunto: ${NOME} | leads: ${leads.length} | regra de escopo: ${SEM_ESCOPO ? 'DESLIGADA (prompt antigo)' : 'LIGADA'}`)
console.log(`Modelo: ${process.env.GEMINI_MODEL || 'padrão do leads.ia.js'} | intervalo: ${INTERVALO_MS / 1000} s | tempo estimado: ~${Math.ceil((leads.length * (INTERVALO_MS + 1500)) / 60000)} min\n`)

// A classificarLead imprime a resposta bruta da IA a cada lead; aqui isso só polui a saída
const logOriginal = console.log
async function classificarEmSilencio(dados) {
  console.log = () => {}
  try {
    return await classificarLead(dados, escopo)
  } finally {
    console.log = logOriginal
  }
}

const linhas = []
for (const [i, item] of leads.entries()) {
  let obtido = 'erro'
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      obtido = (await classificarEmSilencio(item.lead)) ? 'aprovado' : 'barrado'
      break
    } catch (erro) {
            console.log(`   ${item.id}: falha na tentativa ${tentativa} (${erro.message.slice(-70)})`)
      if (tentativa < TENTATIVAS) await esperar(30000)
    }
  }

  const categoria = item.grupo === 'ambiguo' ? 'ambiguo' : `${item.grupo}/${item.variante}`
  const certo = obtido === item.resultadoEsperado
  linhas.push({ id: item.id, categoria, esperado: item.resultadoEsperado, obtido, certo, mensagem: item.lead.mensagem })

  const marca = obtido === 'erro' ? '⚠️ ' : certo ? '✅' : '❌'
  console.log(`${marca} [${i + 1}/${leads.length}] ${item.id.padEnd(8)} esperado ${item.resultadoEsperado.padEnd(8)} obtido ${obtido}`)

  if (i < leads.length - 1) await esperar(INTERVALO_MS)
}

// ── Resumo ──────────────────────────────────────────────────────────────────
const avaliados = linhas.filter((l) => l.obtido !== 'erro')
const validos = avaliados.filter((l) => l.esperado === 'aprovado')
const ruins = avaliados.filter((l) => l.esperado === 'barrado')
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1).replace('.', ',')}%` : '-')

console.log('\n══════════════ RESUMO ══════════════')
console.log(`Regra de escopo: ${SEM_ESCOPO ? 'desligada' : 'ligada'}`)
console.log(`Triagem geral:     ${avaliados.filter((l) => l.certo).length} de ${avaliados.length} (${pct(avaliados.filter((l) => l.certo).length, avaliados.length)})`)
if (validos.length) console.log(`Válidos aprovados: ${validos.filter((l) => l.certo).length} de ${validos.length} (${pct(validos.filter((l) => l.certo).length, validos.length)})`)
if (ruins.length) console.log(`Ruins barrados:    ${ruins.filter((l) => l.certo).length} de ${ruins.length} (${pct(ruins.filter((l) => l.certo).length, ruins.length)})`)

console.log('\nPor categoria:')
for (const categoria of [...new Set(linhas.map((l) => l.categoria))]) {
  const daCategoria = avaliados.filter((l) => l.categoria === categoria)
  console.log(`  ${categoria.padEnd(22)} ${daCategoria.filter((l) => l.certo).length}/${daCategoria.length}`)
}

const erradas = avaliados.filter((l) => !l.certo)
console.log(`\nDecisões erradas (${erradas.length}):`)
for (const l of erradas) console.log(`  ${l.id} (${l.esperado} -> ${l.obtido}): ${l.mensagem}`)

const falhas = linhas.filter((l) => l.obtido === 'erro')
if (falhas.length) console.log(`\n⚠️  ${falhas.length} lead(s) sem resposta da IA (ficaram fora da conta): ${falhas.map((l) => l.id).join(', ')}`)

// ── CSV ─────────────────────────────────────────────────────────────────────
const nomeArquivo = SEM_ESCOPO ? 'teste-sem-escopo.csv' : 'teste-escopo.csv'
const csv = ['id;categoria;esperado;obtido;certo']
  .concat(linhas.map((l) => [l.id, l.categoria, l.esperado, l.obtido, l.certo ? 1 : 0].join(';')))
  .join('\n')
await mkdir(PASTA, { recursive: true })
await writeFile(new URL(nomeArquivo, PASTA), '\uFEFF' + csv + '\n', 'utf8')
console.log(`\nTabela salva em ${PASTA_TEXTO}/${nomeArquivo}`)