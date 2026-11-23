// Qual conjunto de leads o experimento usa e onde ficam os resultados dele.
//
//   CONJUNTO=leads         -> experimento/leads.json         (padrão, primeiro experimento)
//   CONJUNTO=leads-medico  -> experimento/leads-medico.json  (distribuidora médico-hospitalar)
//
// Cada conjunto grava em experimento/resultados/<conjunto>/. Assim o envios.json de um
// experimento não faz o outro pular leads.
import { access, readFile } from 'node:fs/promises'

export const NOME = process.env.CONJUNTO || 'leads'

if (!/^[a-z0-9-]+$/i.test(NOME)) {
  console.error(`CONJUNTO inválido: "${NOME}". Use só letras, números e hífen (ex.: leads-medico).`)
  process.exit(1)
}

export const PASTA = new URL(`./resultados/${NOME}/`, import.meta.url)
export const PASTA_TEXTO = `experimento/resultados/${NOME}`

export async function lerConjunto() {
  try {
    return JSON.parse(await readFile(new URL(`./${NOME}.json`, import.meta.url), 'utf8'))
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro
    console.error(`Não achei experimento/${NOME}.json.`)
    process.exit(1)
  }
}

// Antes de existir mais de um conjunto, os resultados ficavam soltos em resultados/.
// Se ainda estiverem lá, para tudo: enviar de novo os leads antigos estragaria o experimento.
export async function exigirResultadosOrganizados() {
  const antigo = new URL('./resultados/envios.json', import.meta.url)
  if (await access(antigo).then(() => true, () => false)) {
    console.error('Os resultados do primeiro experimento ainda estão soltos em experimento/resultados/.')
    console.error('Mova-os para experimento/resultados/leads/ antes de continuar (passo 0 do LEIAME-medico.md).')
    process.exit(1)
  }
}
