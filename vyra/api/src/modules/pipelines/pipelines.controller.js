import * as pipelinesService from './pipelines.service.js'

export async function criarPipelineHandler(request, reply) {
  try {
    const result = await pipelinesService.criarPipeline(request.body)
    return reply.status(201).send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function listarPipelinesHandler(request, reply) {
  try {
    const result = await pipelinesService.listarPipelines()
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function atualizarPipelineHandler(request, reply) {
  try {
    const result = await pipelinesService.atualizarPipeline(request.params.id, request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function deletarPipelineHandler(request, reply) {
  try {
    await pipelinesService.deletarPipeline(request.params.id)
    return reply.status(204).send()
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function criarEtapaHandler(request, reply) {
  try {
    const result = await pipelinesService.criarEtapa(request.params.pipelineId, request.body)
    return reply.status(201).send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function atualizarEtapaHandler(request, reply) {
  try {
    const result = await pipelinesService.atualizarEtapa(request.params.id, request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function deletarEtapaHandler(request, reply) {
  try {
    await pipelinesService.deletarEtapa(request.params.id)
    return reply.status(204).send()
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}