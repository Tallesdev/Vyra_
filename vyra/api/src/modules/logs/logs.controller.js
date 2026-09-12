import * as logsService from './logs.service.js'

export async function dashboardHandler(request, reply) {
  try {
    const result = await logsService.dashboard(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function serieHandler(request, reply) {
  try {
    const result = await logsService.serie(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function rankingHandler(request, reply) {
  try {
    const result = await logsService.ranking(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function origensHandler(request, reply) {
  try {
    const result = await logsService.origens(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}
