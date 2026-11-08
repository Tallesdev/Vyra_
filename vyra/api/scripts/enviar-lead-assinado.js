import { createHmac } from 'node:crypto'

const URL_WEBHOOK = process.env.WEBHOOK_URL || 'http://localhost:3000/api/leads/webhook'
const SEGREDO = process.env.WEBHOOK_SECRET

if (!SEGREDO) {
  console.error('Defina WEBHOOK_SECRET antes de rodar este script.')
  process.exit(1)
}

const lead = {
  nome: 'Carlos Mendes',
  telefone: '11999990003',
  mensagem: 'Gostaria de um orçamento do sistema para minha loja com 3 funcionários.',
  origem: 'qa_webhook_assinado',
}

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
