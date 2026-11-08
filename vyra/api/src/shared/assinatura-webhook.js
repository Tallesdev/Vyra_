import { createHmac, timingSafeEqual } from 'node:crypto'

const JANELA_SEGUNDOS = 5 * 60

export function calcularAssinatura(segredo, timestamp, corpoBruto) {
  const hmac = createHmac('sha256', segredo).update(`${timestamp}.${corpoBruto}`).digest('hex')
  return `sha256=${hmac}`
}

export function assinaturaValida({ segredo, timestamp, corpoBruto, assinatura, agora }) {
  if (!segredo || !timestamp || !assinatura || corpoBruto === undefined) return false

  const ts = Number(timestamp)
  if (!Number.isInteger(ts) || Math.abs(agora - ts) > JANELA_SEGUNDOS) return false

  const esperada = Buffer.from(calcularAssinatura(segredo, timestamp, corpoBruto))
  const recebida = Buffer.from(String(assinatura))
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida)
}

export async function verificarAssinaturaWebhook(request, reply) {
  const segredo = process.env.WEBHOOK_SECRET
  if (!segredo) {
    request.log.error('WEBHOOK_SECRET não configurado — o webhook está recusando todas as requisições')
    return reply.status(503).send({ message: 'Webhook indisponível' })
  }

  const ok = assinaturaValida({
    segredo,
    timestamp: request.headers['x-vyra-timestamp'],
    corpoBruto: request.rawBody,
    assinatura: request.headers['x-vyra-signature'],
    agora: Math.floor(Date.now() / 1000),
  })

  if (!ok) {
    return reply.status(401).send({ message: 'Assinatura do webhook inválida ou ausente' })
  }
}
