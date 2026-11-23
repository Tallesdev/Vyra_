// Gera os gráficos do experimento em SVG, a partir das mesmas linhas do relatório.
// É chamado pelo relatorio.js e não precisa de nenhuma biblioteca.
// SVG abre em qualquer navegador e entra no Word como imagem (Inserir > Imagens), sem perder nitidez.
//
// Arquivos gerados em experimento/resultados/<conjunto>/graficos/:
//   acuracia.svg         acerto na escolha do consultor: IA × palavras-chave × aleatório
//   matriz-confusao.svg  matrizes de confusão da IA e das palavras-chave (leads claros)
//   tempo-resposta.svg   distribuição do tempo do webhook até o lead aparecer no CRM
import { mkdir, writeFile } from 'node:fs/promises'

const FONTE = 'Arial, Helvetica, sans-serif'
const COR = {
  ia: '#2a78d6',
  palavras: '#d9711c',
  aleatorio: '#a3a29b',
  tinta: '#1a1a19',
  tinta2: '#4a4945',
  mudo: '#6f6d68',
  grade: '#e4e2dd',
  zero: '#f0efec',
}
// Escala de azul para as células da matriz (claro = poucos leads, escuro = muitos)
const RAMPA = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281']

const pct1 = (valor) => `${valor.toFixed(1).replace('.', ',')}%`
const seg1 = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`
const nome = (email) => (email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : '')

function texto(x, y, conteudo, { tamanho = 13, cor = COR.tinta, ancora = 'start', peso = 400 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${tamanho}" fill="${cor}" text-anchor="${ancora}" font-weight="${peso}">${conteudo}</text>`
}

function documento(largura, altura, conteudo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="${FONTE}">
<rect width="${largura}" height="${altura}" fill="#ffffff"/>
${conteudo.join('\n')}
</svg>
`
}

// Barra com o topo arredondado e a base reta, apoiada na linha do zero
function barra(x, yBase, largura, altura, cor) {
  if (altura <= 0) return ''
  const r = Math.min(4, altura, largura / 2)
  const yTopo = yBase - altura
  return `<path d="M${x},${yBase} V${yTopo + r} Q${x},${yTopo} ${x + r},${yTopo} H${x + largura - r} Q${x + largura},${yTopo} ${x + largura},${yTopo + r} V${yBase} Z" fill="${cor}"/>`
}

function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)]
}

// ─── 1. Acurácia na escolha do consultor ──────────────────────────────────────

function graficoAcuracia(linhas, consultores) {
  const aprovados = linhas.filter((l) => l.obtido === 'aprovado')
  const claros = aprovados.filter((l) => l.grupo === 'claro')
  // Sorteio: 1 chance em n nos claros, 2 em n nos ambíguos (dois consultores aceitos)
  const aleatorioClaro = 100 / consultores.length
  const aleatorioAmbiguo = 200 / consultores.length
  const recorte = (rotulo, grupo, aleatorio) => ({
    rotulo,
    n: grupo.length,
    ia: (100 * grupo.filter((l) => l.acertoIA).length) / (grupo.length || 1),
    palavras: (100 * grupo.reduce((soma, l) => soma + l.acertoSorteio, 0)) / (grupo.length || 1),
    aleatorio,
  })
  const grupos = [
    recorte('Todos os claros', claros, aleatorioClaro),
    recorte('Técnicos', claros.filter((l) => l.variante === 'tecnico'), aleatorioClaro),
    recorte('Leigos', claros.filter((l) => l.variante === 'leigo'), aleatorioClaro),
    recorte('Ambíguos', aprovados.filter((l) => l.grupo === 'ambiguo'), aleatorioAmbiguo),
  ]
  const series = [
    { chave: 'ia', rotulo: 'IA do Vyra', cor: COR.ia },
    { chave: 'palavras', rotulo: 'Palavras-chave (sorteio nos empates)', cor: COR.palavras },
    { chave: 'aleatorio', rotulo: 'Aleatório (teórico)', cor: COR.aleatorio },
  ]

  const L = 820, A = 460
  const esq = 64, dir = 800, topo = 70, base = 380
  const y = (v) => base - ((base - topo) * v) / 100
  const partes = []

  // Legenda em uma linha acima do gráfico
  let xLegenda = esq
  for (const s of series) {
    partes.push(`<rect x="${xLegenda}" y="22" width="14" height="14" rx="3" fill="${s.cor}"/>`)
    partes.push(texto(xLegenda + 20, 34, s.rotulo, { tamanho: 13, cor: COR.tinta2 }))
    xLegenda += 20 + s.rotulo.length * 7.2 + 28
  }

  // Grade e eixo Y
  for (let v = 0; v <= 100; v += 20) {
    partes.push(`<line x1="${esq}" x2="${dir}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? COR.tinta2 : COR.grade}" stroke-width="1"/>`)
    partes.push(texto(esq - 10, y(v) + 4, `${v}%`, { tamanho: 12, cor: COR.mudo, ancora: 'end' }))
  }
  partes.push(`<text transform="translate(18 ${(topo + base) / 2}) rotate(-90)" font-size="12" fill="${COR.mudo}" text-anchor="middle">Leads atribuídos ao consultor certo</text>`)

  // Barras
  const larguraGrupo = (dir - esq) / grupos.length
  const larguraBarra = 46
  const vao = 6
  grupos.forEach((g, i) => {
    const inicio = esq + i * larguraGrupo + (larguraGrupo - (3 * larguraBarra + 2 * vao)) / 2
    series.forEach((s, j) => {
      const x = inicio + j * (larguraBarra + vao)
      const valor = g[s.chave]
      partes.push(barra(x, base, larguraBarra, base - y(valor), s.cor))
      partes.push(texto(x + larguraBarra / 2, y(valor) - 6, pct1(valor), { tamanho: 12, ancora: 'middle', peso: s.chave === 'ia' ? 700 : 400 }))
    })
    const centro = esq + i * larguraGrupo + larguraGrupo / 2
    partes.push(texto(centro, base + 24, g.rotulo, { tamanho: 13, ancora: 'middle', peso: 600 }))
    partes.push(texto(centro, base + 42, `${g.n} leads`, { tamanho: 12, ancora: 'middle', cor: COR.mudo }))
  })

  return documento(L, A, partes)
}

// ─── 2. Matrizes de confusão ──────────────────────────────────────────────────

function graficoMatrizes(linhas, consultores) {
  const claros = linhas.filter((l) => l.grupo === 'claro' && l.obtido === 'aprovado')
  const colunas = [...consultores, null]
  const n = consultores.length
  // Margem esquerda cresce com o nome mais comprido; com mais de 4 consultores as células
  // ficam mais largas para nomes como "Fernanda" caberem no cabeçalho
  const maiorNome = Math.max(...consultores.map((c) => nome(c).length))
  const G = { esq: Math.max(74, 30 + maiorNome * 8.5), topo: 58, cel: n > 4 ? 70 : 62, alt: 50, vao: 3, separa: 12, dir: 64 }
  const largura = G.esq + n * (G.cel + G.vao) + G.separa + G.cel + G.dir
  const altura = G.topo + consultores.length * (G.alt + G.vao) + 6
  const xCol = (c) => G.esq + c * (G.cel + G.vao) + (c === consultores.length ? G.separa : 0)
  const yLin = (r) => G.topo + r * (G.alt + G.vao)
  const maximo = Math.max(...consultores.map((c) => claros.filter((l) => l.aceitos[0] === c).length), 1)

  function cor(valor) {
    if (valor === 0) return COR.zero
    return RAMPA[Math.round(((valor - 1) / Math.max(maximo - 1, 1)) * (RAMPA.length - 1))]
  }

  function matriz(campo) {
    const partes = []
    partes.push(texto(xCol(0) + (n / 2) * (G.cel + G.vao), 14, 'Consultor escolhido pelo método', { tamanho: 12, cor: COR.mudo, ancora: 'middle' }))
    partes.push(`<text transform="translate(12 ${yLin(0) + (n / 2) * (G.alt + G.vao)}) rotate(-90)" font-size="12" fill="${COR.mudo}" text-anchor="middle">Consultor correto</text>`)
    colunas.forEach((c, i) => {
      const x = xCol(i) + G.cel / 2
      if (c === null) {
        partes.push(texto(x, G.topo - 22, 'Sem', { tamanho: 12, cor: COR.tinta2, ancora: 'middle' }))
        partes.push(texto(x, G.topo - 8, 'decisão', { tamanho: 12, cor: COR.tinta2, ancora: 'middle' }))
      } else {
        partes.push(texto(x, G.topo - 10, nome(c), { tamanho: 13, ancora: 'middle', peso: 600 }))
      }
    })
    partes.push(texto(xCol(consultores.length) + G.cel + G.dir - 4, G.topo - 10, 'Acerto', { tamanho: 12, cor: COR.mudo, ancora: 'end' }))

    consultores.forEach((correto, r) => {
      const doConsultor = claros.filter((l) => l.aceitos[0] === correto)
      const y = yLin(r)
      partes.push(texto(G.esq - 10, y + G.alt / 2 + 5, nome(correto), { tamanho: 13, ancora: 'end', peso: 600 }))
      colunas.forEach((escolhido, c) => {
        const valor = doConsultor.filter((l) => l[campo] === escolhido).length
        const fundo = cor(valor)
        const x = xCol(c)
        const diagonal = escolhido === correto
        partes.push(`<rect x="${x}" y="${y}" width="${G.cel}" height="${G.alt}" rx="4" fill="${fundo}"${diagonal ? ` stroke="${COR.tinta}" stroke-width="2"` : ''}/>`)
        const claro = RAMPA.indexOf(fundo) >= 6
        partes.push(texto(x + G.cel / 2, y + G.alt / 2 + 5, valor, {
          tamanho: valor === 0 ? 13 : 15,
          ancora: 'middle',
          peso: valor === 0 ? 400 : 700,
          cor: valor === 0 ? COR.mudo : claro ? '#ffffff' : COR.tinta,
        }))
      })
      const acertos = doConsultor.filter((l) => l[campo] === correto).length
      partes.push(texto(xCol(consultores.length) + G.cel + G.dir - 4, y + G.alt / 2 + 5, pct1((100 * acertos) / (doConsultor.length || 1)), { tamanho: 13, cor: COR.tinta2, ancora: 'end' }))
    })
    return partes.join('\n')
  }

  const total = claros.length
  const ia = claros.filter((l) => l.consultorIA === l.aceitos[0]).length
  const pal = claros.filter((l) => l.consultorPalavras === l.aceitos[0]).length
  const margem = 24, titulo = 40, entre = 40
  const tituloIA = `(a) IA do Vyra: ${ia} de ${total} (${pct1((100 * ia) / (total || 1))})`
  const tituloPalavras = `(b) Palavras-chave: ${pal} de ${total} (${pct1((100 * pal) / (total || 1))})`
  const legenda = 'Contorno = acerto (consultor correto). Cor mais escura = mais leads naquela célula.'

  // Até 4 consultores: lado a lado. Com mais, uma embaixo da outra, para caber numa página A4.
  const empilhar = n > 4
  const posicaoB = empilhar ? { x: margem, y: margem + titulo + altura + entre } : { x: margem + largura + entre, y: margem }
  const L = empilhar ? margem * 2 + largura : margem * 2 + largura * 2 + entre
  const A = posicaoB.y + titulo + altura + margem + 22
  return documento(L, A, [
    texto(margem, margem + 16, tituloIA, { tamanho: 16, peso: 700 }),
    texto(posicaoB.x, posicaoB.y + 16, tituloPalavras, { tamanho: 16, peso: 700 }),
    `<g transform="translate(${margem} ${margem + titulo})">${matriz('consultorIA')}</g>`,
    `<g transform="translate(${posicaoB.x} ${posicaoB.y + titulo})">${matriz('consultorPalavras')}</g>`,
    texto(margem, A - 14, legenda, { tamanho: 12, cor: COR.mudo }),
  ])
}

// ─── 3. Tempo de resposta ─────────────────────────────────────────────────────

function graficoTempo(linhas) {
  const tempos = linhas
    .filter((l) => (l.obtido === 'aprovado' || l.obtido === 'barrado') && l.tempoMs !== null)
    .map((l) => l.tempoMs)
  if (!tempos.length) return null

  const media = tempos.reduce((soma, v) => soma + v, 0) / tempos.length
  const mediana = percentil(tempos, 50)
  const p95 = percentil(tempos, 95)
  const maximoMs = Math.max(...tempos)

  // Faixas de 1 segundo: 0–1 s, 1–2 s, ...
  const faixas = Array.from({ length: Math.ceil(maximoMs / 1000) || 1 }, () => 0)
  for (const t of tempos) faixas[Math.min(faixas.length - 1, Math.floor(t / 1000))]++
  // Eixo Y com 4 divisões "redondas" e uma folga acima da maior barra para os rótulos
  const maiorFaixa = Math.max(...faixas)
  const passoY = [5, 10, 20, 25, 40, 50, 100].find((p) => p * 4 >= maiorFaixa * 1.12) ?? 100
  const topoEixo = passoY * 4

  const L = 820, A = 440
  const esq = 64, dir = 800, topo = 74, base = 370
  const x = (segundos) => esq + ((dir - esq) * segundos) / faixas.length
  const y = (quantidade) => base - ((base - topo) * quantidade) / topoEixo
  const partes = []

  partes.push(texto(esq, 32, `Média ${seg1(media)}   ·   Mediana ${seg1(mediana)}   ·   95% dos leads em até ${seg1(p95)}   ·   Mais lento ${seg1(maximoMs)}   ·   ${tempos.length} leads`, { tamanho: 13, cor: COR.tinta2 }))

  for (let v = 0; v <= topoEixo; v += passoY) {
    partes.push(`<line x1="${esq}" x2="${dir}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? COR.tinta2 : COR.grade}" stroke-width="1"/>`)
    partes.push(texto(esq - 10, y(v) + 4, v, { tamanho: 12, cor: COR.mudo, ancora: 'end' }))
  }
  partes.push(`<text transform="translate(18 ${(topo + base) / 2}) rotate(-90)" font-size="12" fill="${COR.mudo}" text-anchor="middle">Quantidade de leads</text>`)

  const larguraFaixa = (dir - esq) / faixas.length
  const numeros = []
  faixas.forEach((quantidade, i) => {
    partes.push(barra(x(i) + 1, base, larguraFaixa - 2, base - y(quantidade), COR.ia))
    // Contorno branco no número, para ele continuar legível onde a linha tracejada passa
    if (quantidade > 0) numeros.push(`<text x="${x(i) + larguraFaixa / 2}" y="${y(quantidade) - 6}" font-size="11" fill="${COR.tinta2}" text-anchor="middle" stroke="#ffffff" stroke-width="4" paint-order="stroke">${quantidade}</text>`)
  })
  const passo = faixas.length > 12 ? 2 : 1
  for (let s = 0; s <= faixas.length; s += passo) {
    partes.push(texto(x(s), base + 18, `${s}`, { tamanho: 12, cor: COR.mudo, ancora: 'middle' }))
  }
  partes.push(texto((esq + dir) / 2, base + 42, 'Segundos do recebimento no webhook até o lead aparecer no CRM', { tamanho: 12, cor: COR.mudo, ancora: 'middle' }))

  // Linhas da mediana e do percentil 95
  for (const [ms, rotulo] of [[mediana, `Mediana ${seg1(mediana)}`], [p95, `95% em até ${seg1(p95)}`]]) {
    const xm = x(ms / 1000)
    partes.push(`<line x1="${xm}" x2="${xm}" y1="${topo - 14}" y2="${base}" stroke="${COR.tinta}" stroke-width="1.5" stroke-dasharray="5 4"/>`)
    partes.push(texto(xm + 6, topo - 4, rotulo, { tamanho: 12, peso: 600 }))
  }
  partes.push(...numeros) // por último, para ficarem por cima das linhas

  return documento(L, A, partes)
}

// ─── Gravação ─────────────────────────────────────────────────────────────────

export async function gerarGraficos({ linhas, consultores, pasta, pastaTexto = 'experimento/resultados' }) {
  const destino = new URL('graficos/', pasta)
  await mkdir(destino, { recursive: true })
  const arquivos = {
    'acuracia.svg': graficoAcuracia(linhas, consultores),
    'matriz-confusao.svg': graficoMatrizes(linhas, consultores),
    'tempo-resposta.svg': graficoTempo(linhas),
  }
  const gerados = []
  for (const [nomeArquivo, conteudo] of Object.entries(arquivos)) {
    if (!conteudo) continue
    await writeFile(new URL(nomeArquivo, destino), conteudo)
    gerados.push(`${pastaTexto}/graficos/${nomeArquivo}`)
  }
  return gerados
}
