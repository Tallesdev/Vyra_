// Cruza o gabarito (leads.json) com o que o sistema realmente fez e gera o relatório do experimento.
//
// Uso (depois do enviar.js e de esperar a fila esvaziar):
//   docker exec vyra_api node experimento/relatorio.js
//
// Gera experimento/resultados/relatorio.md (texto para o TCC) e
// experimento/resultados/resultados.csv (uma linha por lead, abre no Excel).
// Só LÊ o banco: pode rodar quantas vezes quiser.
import { readFile, writeFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import mongoose from 'mongoose'

const PASTA = new URL('./resultados/', import.meta.url)

// ─── Funções de apoio ─────────────────────────────────────────────────────────

const digitos = (telefone) => String(telefone ?? '').replace(/\D/g, '').slice(-11)
const pct = (parte, total) => (total ? `${((100 * parte) / total).toFixed(1).replace('.', ',')}%` : '-')
const curto = (email) => (email ? email.split('@')[0] : '-')

function percentil(valores, p) {
  if (!valores.length) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)]
}

// ─── Linha de base: palavras-chave ────────────────────────────────────────────
// Método ingênuo, sem IA: as palavras-chave de cada consultor são as palavras do
// próprio texto de perfil (o mesmo texto que vira o vetor da IA). Ganha o consultor
// com mais palavras do perfil presentes na mensagem. Empate no topo ou nenhuma
// palavra em comum = "sem decisão" (conta como erro).

const PALAVRAS_VAZIAS = new Set([
  'para', 'com', 'que', 'dos', 'das', 'nos', 'nas', 'por', 'uma', 'como', 'mais', 'sem',
  'seu', 'sua', 'seus', 'suas', 'ate', 'tem', 'sao', 'ser', 'pelo', 'pela', 'entre', 'sobre',
  'este', 'esta', 'isso', 'the', 'and',
])

function palavras(texto) {
  return new Set(
    String(texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p))
  )
}

function criarClassificadorPorPalavras(consultores) {
  const perfis = Object.entries(consultores).map(([email, perfil]) => ({ email, chaves: palavras(perfil) }))

  return function escolher(mensagem) {
    const texto = palavras(mensagem)
    const pontos = perfis.map(({ email, chaves }) => ({
      email,
      pontos: [...chaves].filter((p) => texto.has(p)).length,
    }))
    const maximo = Math.max(...pontos.map((p) => p.pontos))
    const vencedores = pontos.filter((p) => p.pontos === maximo)
    if (maximo === 0 || vencedores.length > 1) return null
    return vencedores[0].email
  }
}

// ─── Leitura dos dados ────────────────────────────────────────────────────────

const conjunto = JSON.parse(await readFile(new URL('./leads.json', import.meta.url), 'utf8'))
const envios = JSON.parse(await readFile(new URL('envios.json', PASTA), 'utf8'))
const envioPorId = new Map(envios.map((e) => [e.id, e]))
const primeiroEnvio = new Date(Math.min(...envios.map((e) => new Date(e.enviadoEm).getTime())))

const prisma = new PrismaClient()
await mongoose.connect(process.env.MONGODB_URL)

const usuarios = await prisma.usuario.findMany({ select: { id: true, email: true } })
const emailPorId = new Map(usuarios.map((u) => [u.id, u.email]))

// Só leads criados depois do primeiro envio, para não confundir com dados antigos
const leadsDoBanco = await prisma.lead.findMany({
  where: { createdAt: { gte: primeiroEnvio } },
  select: { id: true, telefone: true, status: true, consultorId: true, semCriterio: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
})
const leadPorTelefone = new Map()
for (const lead of leadsDoBanco) {
  if (!leadPorTelefone.has(digitos(lead.telefone))) leadPorTelefone.set(digitos(lead.telefone), lead)
}

// Evento CRIACAO da timeline: guarda a escolha ORIGINAL da IA, o score e o motivo
// da repescagem (mesmo que alguém tenha mexido no lead depois)
const criacoes = await mongoose.connection.db
  .collection('timelines')
  .find({ leadId: { $in: leadsDoBanco.map((l) => l.id) }, tipo: 'CRIACAO' })
  .toArray()
const criacaoPorLead = new Map(criacoes.map((c) => [c.leadId, c]))

await prisma.$disconnect()
await mongoose.disconnect()

// ─── O que aconteceu com cada lead ────────────────────────────────────────────

const escolherPorPalavras = criarClassificadorPorPalavras(conjunto.consultores)

const linhas = conjunto.leads.map((item) => {
  const envio = envioPorId.get(item.id)
  const linha = {
    id: item.id,
    grupo: item.grupo,
    variante: item.variante,
    esperado: item.resultadoEsperado,
    aceitos: item.consultoresAceitos,
    obtido: 'nao_enviado',
    camada: '',
    consultorIA: null,
    consultorPalavras: escolherPorPalavras(item.lead.mensagem),
    score: null,
    semCriterio: null,
    tempoMs: null,
  }
  if (!envio) return linha

  if (envio.status === 400) return { ...linha, obtido: 'barrado', camada: 'Camada 1' }
  if (envio.status !== 200) return { ...linha, obtido: 'erro_envio' }

  const lead = leadPorTelefone.get(digitos(item.lead.telefone))
  if (!lead) return { ...linha, obtido: 'nao_processado' }

  const criacao = criacaoPorLead.get(lead.id)
  const tempoMs = new Date(lead.createdAt).getTime() - new Date(envio.enviadoEm).getTime()

  if (lead.status === 'REPESCAGEM') {
    const motivo = String(criacao?.metadata?.motivo ?? '')
    if (motivo.includes('indisponível')) return { ...linha, obtido: 'ia_indisponivel', tempoMs }
    return { ...linha, obtido: 'barrado', camada: 'Camada 2', tempoMs }
  }

  return {
    ...linha,
    obtido: 'aprovado',
    consultorIA: emailPorId.get(criacao?.metadata?.consultorId ?? lead.consultorId) ?? null,
    score: typeof criacao?.metadata?.score === 'number' ? criacao.metadata.score : null,
    semCriterio: criacao?.metadata?.semCriterio ?? lead.semCriterio,
    tempoMs,
  }
})

for (const l of linhas) {
  l.acertoIA = l.obtido === 'aprovado' && l.aceitos.includes(l.consultorIA)
  l.acertoPalavras = l.aceitos.includes(l.consultorPalavras)
}

// ─── Métricas ─────────────────────────────────────────────────────────────────

const VALIDOS = ['aprovado', 'barrado']
const avaliados = linhas.filter((l) => VALIDOS.includes(l.obtido))
const fora = linhas.filter((l) => !VALIDOS.includes(l.obtido))
const consultores = Object.keys(conjunto.consultores)
const md = []

md.push('# Relatório do experimento — Vyra CRM', '')
md.push(`Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`)
md.push(`Leads no gabarito: ${linhas.length}. Avaliados: ${avaliados.length}. Fora da análise: ${fora.length}.`, '')

if (fora.length) {
  const naoEnviados = fora.filter((l) => l.obtido === 'nao_enviado').length
  const problemas = fora.filter((l) => l.obtido !== 'nao_enviado')
  md.push('> **Atenção:** leads fora da análise.')
  if (naoEnviados) md.push(`> - Ainda não enviados: ${naoEnviados}`)
  if (problemas.length) md.push(`> - Erro no envio, ainda na fila ou IA indisponível: ${problemas.map((l) => `${l.id} (${l.obtido})`).join(', ')}`)
  md.push('')
}

// 1. Triagem
const legitimos = avaliados.filter((l) => l.esperado === 'aprovado')
const ruins = avaliados.filter((l) => l.esperado === 'barrado')
const legitimosAprovados = legitimos.filter((l) => l.obtido === 'aprovado')
const ruinsBarrados = ruins.filter((l) => l.obtido === 'barrado')

md.push('## 1. Triagem (Camadas 1 e 2)', '')
md.push('| Esperado \\ Obtido | Aprovado | Barrado | Total |', '|---|---|---|---|')
md.push(`| Legítimo | ${legitimosAprovados.length} | ${legitimos.length - legitimosAprovados.length} | ${legitimos.length} |`)
md.push(`| Ruim | ${ruins.length - ruinsBarrados.length} | ${ruinsBarrados.length} | ${ruins.length} |`, '')
md.push(`- Legítimos aprovados: **${pct(legitimosAprovados.length, legitimos.length)}**`)
md.push(`- Ruins barrados: **${pct(ruinsBarrados.length, ruins.length)}**`)
md.push(`- Acurácia da triagem: **${pct(legitimosAprovados.length + ruinsBarrados.length, avaliados.length)}**`)
const legitimosBarrados = legitimos.filter((l) => l.obtido === 'barrado')
const ruinsAprovados = ruins.filter((l) => l.obtido === 'aprovado')
if (legitimosBarrados.length) md.push(`- Legítimos barrados por engano: ${legitimosBarrados.map((l) => `${l.id} (${l.camada})`).join(', ')}`)
if (ruinsAprovados.length) md.push(`- Ruins que passaram: ${ruinsAprovados.map((l) => l.id).join(', ')}`)
md.push('')

md.push('| Tipo de lead ruim | Total | Barrados na Camada 1 | Barrados na Camada 2 | Passaram |', '|---|---|---|---|---|')
for (const variante of [...new Set(ruins.map((l) => l.variante))]) {
  const grupo = ruins.filter((l) => l.variante === variante)
  const c1 = grupo.filter((l) => l.camada === 'Camada 1').length
  const c2 = grupo.filter((l) => l.camada === 'Camada 2').length
  md.push(`| ${variante} | ${grupo.length} | ${c1} | ${c2} | ${grupo.length - c1 - c2} |`)
}
md.push('')

// 2. Atribuição dos leads claros
const claros = avaliados.filter((l) => l.grupo === 'claro')
const clarosAprovados = claros.filter((l) => l.obtido === 'aprovado')

function linhaComparacao(rotulo, grupo) {
  const ia = grupo.filter((l) => l.acertoIA).length
  const pal = grupo.filter((l) => l.acertoPalavras).length
  return `| ${rotulo} | ${grupo.length} | **${pct(ia, grupo.length)}** (${ia}) | ${pct(pal, grupo.length)} (${pal}) | 25,0% |`
}

md.push('## 2. Atribuição ao consultor certo (grupo "claro")', '')
md.push('Contando só os leads claros que a triagem aprovou. Aleatório = 1 chance em 4.', '')
md.push('| Recorte | Leads | IA (Vyra) | Palavras-chave | Aleatório |', '|---|---|---|---|---|')
md.push(linhaComparacao('Todos', clarosAprovados))
for (const variante of ['tecnico', 'leigo']) {
  md.push(linhaComparacao(variante === 'tecnico' ? 'Técnico' : 'Leigo', clarosAprovados.filter((l) => l.variante === variante)))
}
for (const email of consultores) {
  md.push(linhaComparacao(`Esperado: ${curto(email)}`, clarosAprovados.filter((l) => l.aceitos[0] === email)))
}
const semDecisao = clarosAprovados.filter((l) => l.consultorPalavras === null).length
md.push('', `Palavras-chave ficaram sem decisão (empate ou nenhuma palavra do perfil) em ${semDecisao} de ${clarosAprovados.length} leads.`, '')

function matriz(titulo, campo, colunaVazia) {
  const colunas = [...consultores, null]
  md.push(`**${titulo}** (linha = consultor correto, coluna = consultor escolhido)`, '')
  md.push(`| Correto \\ Escolhido | ${colunas.map((c) => (c ? curto(c) : colunaVazia)).join(' | ')} |`)
  md.push(`|---|${colunas.map(() => '---').join('|')}|`)
  for (const esperado of consultores) {
    const doConsultor = clarosAprovados.filter((l) => l.aceitos[0] === esperado)
    md.push(`| ${curto(esperado)} | ${colunas.map((c) => doConsultor.filter((l) => l[campo] === c).length).join(' | ')} |`)
  }
  md.push('')
}
matriz('Matriz de confusão — IA', 'consultorIA', 'nenhum')
matriz('Matriz de confusão — palavras-chave', 'consultorPalavras', 'sem decisão')

// 3. Ambíguos
const ambiguos = avaliados.filter((l) => l.grupo === 'ambiguo' && l.obtido === 'aprovado')
const ambIA = ambiguos.filter((l) => l.acertoIA).length
const ambPal = ambiguos.filter((l) => l.acertoPalavras).length
md.push('## 3. Leads ambíguos (dois consultores aceitos)', '')
md.push('| Leads | IA (Vyra) | Palavras-chave | Aleatório |', '|---|---|---|---|')
md.push(`| ${ambiguos.length} | **${pct(ambIA, ambiguos.length)}** (${ambIA}) | ${pct(ambPal, ambiguos.length)} (${ambPal}) | 50,0% |`, '')

// 4. Similaridade
const comScore = avaliados.filter((l) => l.obtido === 'aprovado' && l.score !== null && l.grupo === 'claro')
const media = (lista) => (lista.length ? (lista.reduce((s, v) => s + v, 0) / lista.length).toFixed(3).replace('.', ',') : '-')
md.push('## 4. Similaridade de cosseno (leads claros)', '')
md.push(`- Média quando a IA acertou: ${media(comScore.filter((l) => l.acertoIA).map((l) => l.score))}`)
md.push(`- Média quando a IA errou: ${media(comScore.filter((l) => !l.acertoIA).map((l) => l.score))}`)
md.push(`- Leads marcados "sem critério" (score < 0,3): ${avaliados.filter((l) => l.semCriterio).length}`, '')

// 5. Tempo
const tempos = avaliados.filter((l) => l.tempoMs !== null).map((l) => l.tempoMs)
const seg = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`
md.push('## 5. Tempo do webhook até o lead aparecer no CRM', '')
md.push('Inclui a fila, a classificação e o embedding no Gemini e a gravação no banco.', '')
md.push(`- Leads medidos: ${tempos.length}`)
md.push(`- Média: ${seg(tempos.reduce((s, v) => s + v, 0) / (tempos.length || 1))}`)
md.push(`- Mediana: ${seg(percentil(tempos, 50))}`)
md.push(`- 95% dos leads em até: ${seg(percentil(tempos, 95))}`)
md.push(`- Mais lento: ${seg(tempos.length ? Math.max(...tempos) : 0)}`, '')

// ─── Arquivos ─────────────────────────────────────────────────────────────────

const cabecalho = 'id;grupo;variante;esperado;obtido;camada;consultores_aceitos;consultor_ia;acerto_ia;consultor_palavras;acerto_palavras;score;sem_criterio;tempo_ms'
const csv = linhas.map((l) =>
  [
    l.id, l.grupo, l.variante, l.esperado, l.obtido, l.camada,
    l.aceitos.map(curto).join('+'), curto(l.consultorIA), l.acertoIA ? 1 : 0,
    curto(l.consultorPalavras), l.acertoPalavras ? 1 : 0,
    l.score === null ? '' : l.score.toFixed(4).replace('.', ','),
    l.semCriterio === null ? '' : l.semCriterio ? 1 : 0,
    l.tempoMs ?? '',
  ].join(';')
)

await writeFile(new URL('relatorio.md', PASTA), md.join('\n'))
// O \uFEFF no começo faz o Excel abrir o CSV com os acentos certos
await writeFile(new URL('resultados.csv', PASTA), '\uFEFF' + [cabecalho, ...csv].join('\n'))

console.log(md.join('\n'))
console.log('\nArquivos gerados: experimento/resultados/relatorio.md e experimento/resultados/resultados.csv')
