import { Queue } from 'bullmq'
import { criarConexaoRedis } from '../../shared/redis.js'

export const leadsQueue = new Queue('leads', { connection: criarConexaoRedis() })
