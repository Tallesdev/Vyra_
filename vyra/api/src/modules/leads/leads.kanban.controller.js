import { moverLead, listarOciosos } from './leads.kanban.service.js'

export async function moverLeadHandler(request, reply) {
  try {
    const result = await moverLead(request.params.id, request.body, request.user)
    return reply.send(result)
  } catch (err) {
    throw err
  }
}

export async function listarOciososHandler(request, reply) {
  try {
    const result = await listarOciosos()
    return reply.send(result)
  } catch (err) {
    throw err
  }
}