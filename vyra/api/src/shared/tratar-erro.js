const ERROS_PRISMA = {
  P2002: { status: 409, message: 'Já existe um registro com esses dados' },
  P2003: { status: 400, message: 'Referência inválida: um dos registros relacionados não existe' },
  P2025: { status: 404, message: 'Registro não encontrado' },
}

export function tratarErro(error, request, reply) {
  const conhecido = ERROS_PRISMA[error.code]
  if (conhecido) {
    request.log.warn(error)
    return reply.status(conhecido.status).send({ message: conhecido.message })
  }

  const status = error.statusCode ?? 500
  if (status >= 500) {
    request.log.error(error)
    return reply.status(500).send({ message: 'Erro interno do servidor', idRequisicao: request.id })
  }

  return reply.status(status).send({
    message: error.message,
    ...(error.erros && { erros: error.erros }),
  })
}
