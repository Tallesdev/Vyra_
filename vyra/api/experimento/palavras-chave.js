// Linha de base: palavras-chave
// Método ingênuo, sem IA: as palavras-chave de cada consultor são as palavras do
// próprio texto de perfil (o mesmo texto que vira o vetor da IA). Ganha o consultor
// com mais palavras do perfil presentes na mensagem. Empate no topo ou nenhuma
// palavra em comum = "sem decisão" (conta como erro na versão estrita).
// Versão com sorteio: nos empates, conta a chance de um sorteio entre os empatados
// acertar (1 em k). Nenhuma palavra em comum = os n consultores empatados = 1 em n.
//
// Fica num arquivo separado para ser usada pelo relatorio.js (com o banco) e pelo
// validar-conjunto.js (sem banco, antes de enviar qualquer lead).

const PALAVRAS_VAZIAS = new Set([
  'para', 'com', 'que', 'dos', 'das', 'nos', 'nas', 'por', 'uma', 'como', 'mais', 'sem',
  'seu', 'sua', 'seus', 'suas', 'ate', 'tem', 'sao', 'ser', 'pelo', 'pela', 'entre', 'sobre',
  'este', 'esta', 'isso', 'the', 'and',
])

export function palavras(texto) {
  return new Set(
    String(texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p))
  )
}

export function criarClassificadorPorPalavras(consultores) {
  const perfis = Object.entries(consultores).map(([email, perfil]) => ({ email, chaves: palavras(perfil) }))

  // Consultores com a maior pontuação (mais de um = empate; todos = nenhuma palavra em comum)
  function empatados(mensagem) {
    const texto = palavras(mensagem)
    const pontos = perfis.map(({ email, chaves }) => ({
      email,
      pontos: [...chaves].filter((p) => texto.has(p)).length,
    }))
    const maximo = Math.max(...pontos.map((p) => p.pontos))
    return pontos.filter((p) => p.pontos === maximo).map((p) => p.email)
  }

  return {
    empatados,
    escolher(mensagem) {
      const vencedores = empatados(mensagem)
      return vencedores.length === 1 ? vencedores[0] : null
    },
  }
}
