import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// O Google descontinua modelos periodicamente: o gemini-2.5-flash-lite deixou
// de aceitar chaves novas e passou a responder 404. Manter os nomes em variável
// de ambiente evita ter que alterar código na próxima troca.
const MODELO_CLASSIFICACAO = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const MODELO_EMBEDDING = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'

// ─── Camada 2 — Triagem semântica ────────────────────────────────────────────
// Retorna true se o lead tem intenção real de compra/contato
export async function classificarLead(dados) {
  const model = genAI.getGenerativeModel({ model: MODELO_CLASSIFICACAO })

  const prompt = `
Você é um classificador de leads comerciais. Analise a mensagem abaixo e responda APENAS com "VALIDO" ou "INVALIDO".

Critérios para VALIDO:
- Demonstra intenção real de compra, contato ou interesse em produto/serviço
- É uma solicitação humana legítima
- Faz sentido como mensagem de um potencial cliente

Critérios para INVALIDO:
- Mensagem automatizada, spam ou teste
- Sem intenção comercial clara
- Conteúdo sem sentido ou aleatório

Nome: ${dados.nome}
Mensagem: ${dados.mensagem}
Origem: ${dados.origem || 'não informada'}

Responda APENAS com "VALIDO" ou "INVALIDO".
`.trim()

  const result = await model.generateContent(prompt)
  const resposta = result.response.text().trim().toUpperCase()

  return resposta.includes('VALIDO')
}

// ─── Geração de embedding ─────────────────────────────────────────────────────
// Gera vetor numérico que representa semanticamente o texto
export async function gerarEmbedding(texto) {
  const model = genAI.getGenerativeModel({ model: MODELO_EMBEDDING })

  const result = await model.embedContent(texto)
  return result.embedding.values
}