import { createHmac } from 'node:crypto'

// Envia um lead assinado para o webhook, como um site de captação faria.
//
// Uso:
//   node scripts/enviar-lead-assinado.js "Nome do cliente" "Mensagem do cliente"
//
// Sem parâmetros, manda um lead de exemplo. O telefone é sorteado a cada envio,
// porque com telefone repetido o worker agrupa a mensagem no lead que já está aberto.
// Variáveis: WEBHOOK_SECRET (obrigatória) e WEBHOOK_URL (padrão: a própria API).

const URL_WEBHOOK = process.env.WEBHOOK_URL || 'http://localhost:3000/api/leads/webhook'
const SEGREDO = process.env.WEBHOOK_SECRET

if (!SEGREDO) {
  console.error('Defina WEBHOOK_SECRET antes de rodar este script.')
  process.exit(1)
}

const [
  nome = 'Carlos Mendes',
  mensagem = 'Gostaria de um orçamento do sistema para minha loja com 3 funcionários.',
] = process.argv.slice(2)

const telefone = '119' + String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')

const lead = { nome, telefone, mensagem, origem: 'demo_ao_vivo' }

const corpo = JSON.stringify(lead)
const timestamp = String(Math.floor(Date.now() / 1000))
const assinatura = 'sha256=' + createHmac('sha256', SEGREDO).update(`${timestamp}.${corpo}`).digest('hex')

const resposta = await fetch(URL_WEBHOOK, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Vyra-Timestamp': timestamp,
    'X-Vyra-Signature': assinatura,
  },
  body: corpo,
})

console.log(resposta.status, await resposta.json())
console.log(`Lead "${nome}" enviado com o telefone ${telefone}`)
