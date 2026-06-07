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