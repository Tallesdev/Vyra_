import * as authService from './auth.service.js'

const COOKIE_REFRESH = 'vyra_refresh'

const opcoesCookieRefresh = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60,
}


export async function loginHandler(request, reply) {
  try {
    const { refreshToken, ...resposta } = await authService.login(request.body, request.server.jwt)
    reply.setCookie(COOKIE_REFRESH, refreshToken, opcoesCookieRefresh)
    return reply.send(resposta)
  } catch (err) {
    throw err
  }
}

export async function refreshHandler(request, reply) {
  try {
    const result = await authService.refresh(
      { refreshToken: request.cookies[COOKIE_REFRESH] },
      request.server.jwt
    )
    return reply.send(result)
  } catch (err) {
    throw err
  }
}

export async function logoutHandler(request, reply) {
  try {
    const result = await authService.logout({ refreshToken: request.cookies[COOKIE_REFRESH] })
    reply.clearCookie(COOKIE_REFRESH, { path: '/api/auth' })
    return reply.send(result)
  } catch (err) {
    throw err
  }
}


export async function recuperarSenhaHandler(request, reply) {
  try {
    const result = await authService.recuperarSenha(request.body)
    return reply.send(result)
  } catch (err) {
    throw err
  }
}

export async function perfilHandler(request, reply) {
  try {
    const result = await authService.perfil(request.user.id)
    return reply.send(result)
  } catch (err) {
    throw err
  }
}