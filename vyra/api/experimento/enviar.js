// Envia os leads do experimento para o webhook, um de cada vez, e guarda a hora
// e a resposta de cada envio em experimento/resultados/envios.json.
//
// Uso:
//   docker exec vyra_api node experimento/enviar.js       -> os 200 leads
//   docker exec vyra_api node experimento/enviar.js 6     -> só os 6 primeiros (ensaio)
//
// Retoma de onde parou: quem já está no envios.json não é mandado de novo, porque
// reenviar o mesmo telefone viraria "lead repetido" e estragaria o resultado.
//
// Intervalo de 6 s entre envios: cada lead faz 2 chamadas ao Gemini, e mandar tudo
// de uma vez estouraria o limite por minuto da API. O lead iria para REPESCAGEM por
// "IA indisponível" e contaminaria o resultado.
import { createHmac } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const URL_WEBHOOK = process.env.WEBHOOK_URL || 'http://localhost:3000/api/leads/webhook'
const SEGREDO = process.env.WEBHOOK_SECRET
const INTERVALO_MS = Number(process.env.INTERVALO_MS ?? 6000)
const PASTA = new URL('./resultados/', import.meta.url)
const ARQUIVO = new URL('envios.json', PASTA)

if (!SEGREDO) {
  console.error('Defina WEBHOOK_SECRET antes de rodar este script.')
  process.exit(1)
}

const conjunto = JSON.parse(await readFile(new URL('./leads.json', import.meta.url), 'utf8'))
const envios = JSON.parse(await readFile(ARQUIVO, 'utf8').catch(() => '[]'))
const jaEnviados = new Set(envios.filter((e) => e.status === 200 || e.status === 400).map((e) => e.id))
const leads = conjunto.leads
  .slice(0, Number(process.argv[2] ?? conjunto.leads.length))
  .filter((item) => !jaEnviados.has(item.id))
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

await mkdir(PASTA, { recursive: true })
if (jaEnviados.size) console.log(`${jaEnviados.size} leads já tinham sido enviados e foram pulados.`)
console.log(`Enviando ${leads.length} leads para ${URL_WEBHOOK}, um a cada ${INTERVALO_MS / 1000} s\n`)

for (const [i, item] of leads.entries()) {
  const corpo = JSON.stringify(item.lead)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const assinatura = 'sha256=' + createHmac('sha256', SEGREDO).update(`${timestamp}.${corpo}`).digest('hex')
  const enviadoEm = new Date().toISOString()

  let status
  let resposta
  try {
    const r = await fetch(URL_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vyra-Timestamp': timestamp,
        'X-Vyra-Signature': assinatura,
      },
      body: corpo,
    })
    status = r.status
    resposta = await r.json().catch(() => null)
  } catch (erro) {
    status = 0
    resposta = { erro: erro.message }
  }

  envios.push({ id: item.id, telefone: item.lead.telefone, enviadoEm, status, resposta })
  // Grava a cada envio: se cair no meio, o que já foi enviado fica registrado
  await writeFile(ARQUIVO, JSON.stringify(envios, null, 2))
  console.log(`${String(i + 1).padStart(3)}/${leads.length}  ${item.id.padEnd(8)}  ${status}`)

  if (i < leads.length - 1) await esperar(INTERVALO_MS)
}

console.log('\nPronto. Envios salvos em experimento/resultados/envios.json')
console.log('Espere 1 minuto para a fila esvaziar e rode o relatório.')
