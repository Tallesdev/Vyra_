import * as usersService from './users.service.js'

export async function criarUsuarioHandler(request, reply) {
  try {
    const result = await usersService.criarUsuario(request.body)
    return reply.status(201).send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function listarUsuariosHandler(request, reply) {
  try {
    const result = await usersService.listarUsuarios(request.user)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function atualizarUsuarioHandler(request, reply) {
  try {
    const result = await usersService.atualizarUsuario(request.params.id, request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function desativarUsuarioHandler(request, reply) {
  try {
    const result = await usersService.desativarUsuario(request.params.id)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function atualizarPerfilIAHandler(request, reply) {
  try {
    const result = await usersService.atualizarPerfilIA(request.params.id, request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}