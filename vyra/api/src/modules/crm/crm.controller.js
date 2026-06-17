import * as crmService from './crm.service.js'

export async function perfilLeadHandler(request, reply) {
  try {
    const result = await crmService.perfilLead(request.params.id, request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function atualizarLeadHandler(request, reply) {
  try {
    const result = await crmService.atualizarLead(request.params.id, request.body, request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function adicionarAtividadeHandler(request, reply) {
  try {
    const result = await crmService.adicionarAtividade(request.params.id, request.body, request.user)
    return reply.status(201).send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function fecharOportunidadeHandler(request, reply) {
  try {
    const result = await crmService.fecharOportunidade(request.params.id, request.body, request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function reatribuirLeadHandler(request, reply) {
  try {
    const result = await crmService.reatribuirLead(request.params.id, request.body, request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}