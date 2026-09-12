import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Cria uma conexão Redis a partir do REDIS_URL.
 *
 * O host não pode ser fixo: dentro do Docker o serviço se chama `redis`,
 * mas ao rodar a API no host (npm run dev) o endereço é `localhost`.
 *
 * Queue e Worker recebem conexões separadas de propósito — o Worker usa
 * comandos bloqueantes (BRPOPLPUSH) que travariam a conexão da Queue.
 * O `maxRetriesPerRequest: null` é exigido pelo BullMQ.
 */
export function criarConexaoRedis() {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
}
