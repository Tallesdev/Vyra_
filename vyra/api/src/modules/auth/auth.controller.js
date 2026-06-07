import * as authService from './auth.service.js'

export async function loginHandler(request, reply) {
  try {
    const result = await authService.login(request.body, request.server.jwt)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function refreshHandler(request, reply) {
  try {
    const result = await authService.refresh(request.body, request.server.jwt)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function logoutHandler(request, reply) {
  try {
    const result = await authService.logout(request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function recuperarSenhaHandler(request, reply) {
  try {
    const result = await authService.recuperarSenha(request.body)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}

export async function perfilHandler(request, reply) {
  try {
    const result = await authService.perfil(request.user.id)
    return reply.send(result)
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message })
  }
}