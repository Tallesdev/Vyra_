export function authorize(...roles) {
  return async function (request, reply) {
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        message: 'Acesso negado: permissão insuficiente',
      })
    }
  }
}