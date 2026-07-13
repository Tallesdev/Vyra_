// Mock do Gemini — retorna respostas fixas sem chamar a API real
export const geminiMock = {
  classificar: async () => true, // sempre válido
  embedding: async () => Array(768).fill(0.1), // vetor fixo
}

export function mockGerarEmbedding() {
  return Array(768).fill(0.1)
}

export function mockClassificarLead() {
  return true
}