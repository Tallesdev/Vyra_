import * as leadsService from './leads.service.js'

export async function webhookHandler(request, reply) {
  try {
    const result = await leadsService.receberWebhook(request.body)
    return reply.send(result)
  } catch (err) {
    return reply
      .status(err.statusCode || 500)
      .send({ message: err.message, erros: err.erros })
  }
}

export async function listarLeadsHandler(request, reply) {
  try {
    const result = await leadsService.listarLeads(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function buscarLeadHandler(request, reply) {
  try {
    const result = await leadsService.buscarLead(request.params.id, request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}