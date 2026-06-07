import { Queue } from 'bullmq'

const connection = {
  host: 'redis',
  port: 6379,
}

export const leadsQueue = new Queue('leads', { connection })