// Similaridade de Cosseno entre dois vetores
// Retorna valor entre -1 e 1 (quanto maior, mais similar)
export function similaridadeCosseno(vetorA, vetorB) {
  if (!vetorA?.length || !vetorB?.length || vetorA.length !== vetorB.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vetorA.length; i++) {
    dotProduct += vetorA[i] * vetorB[i]
    normA += vetorA[i] ** 2
    normB += vetorB[i] ** 2
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Abaixo deste score, nenhum perfil combina de verdade com o lead
export const LIMIAR_SEM_CRITERIO = 0.3

/**
 * Escolhe o consultor de um lead.
 * cargas: [{ consultor: { id, vetorPerfil }, carga }], onde carga = leads abertos dele.
 *
 * - Ganha a maior similaridade de cosseno; empate vai para quem tem menos carga.
 * - Se nem o melhor score chega a 0,3, o lead vai para o consultor menos
 *   carregado, com o selo "Sem critério" (a IA não achou perfil compatível).
 * - Sem nenhum consultor com vetor, devolve consultor null (o worker trata).
 */
export function escolherConsultor(vetorLead, cargas) {
  let melhor = null
  let melhorScore = -1
  let melhorCarga = Infinity

  for (const { consultor, carga } of cargas) {
    if (!consultor.vetorPerfil?.length) continue
    const score = similaridadeCosseno(vetorLead, consultor.vetorPerfil)
    if (score > melhorScore || (score === melhorScore && carga < melhorCarga)) {
      melhor = consultor
      melhorScore = score
      melhorCarga = carga
    }
  }

  if (!melhor) return { consultor: null, score: melhorScore, semCriterio: true }

  if (melhorScore < LIMIAR_SEM_CRITERIO) {
    const menosCarregado = [...cargas].sort((a, b) => a.carga - b.carga)[0].consultor
    return { consultor: menosCarregado, score: melhorScore, semCriterio: true }
  }

  return { consultor: melhor, score: melhorScore, semCriterio: false }
}
