import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

export async function login({ email, senha }, jwt) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario || !usuario.ativo) {
    throw { statusCode: 401, message: 'Credenciais inválidas' }
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha)
  if (!senhaValida) {
    throw { statusCode: 401, message: 'Credenciais inválidas' }
  }

  const accessToken = jwt.sign(
    { id: usuario.id, role: usuario.role },
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { id: usuario.id, type: 'refresh' },
    { expiresIn: '7d' }
  )

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.refreshToken.create({
    data: { token: refreshToken, usuarioId: usuario.id, expiresAt },
  })

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    },
  }
}

export async function refresh({ refreshToken }, jwt) {
  const tokenSalvo = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { usuario: true },
  })

  if (!tokenSalvo || tokenSalvo.expiresAt < new Date()) {
    throw { statusCode: 401, message: 'Refresh token inválido ou expirado' }
  }

  let payload
  try {
    payload = jwt.verify(refreshToken)
  } catch {
    throw { statusCode: 401, message: 'Refresh token inválido' }
  }

  if (payload.type !== 'refresh') {
    throw { statusCode: 401, message: 'Token inválido' }
  }

  const novoAccessToken = jwt.sign(
    { id: tokenSalvo.usuario.id, role: tokenSalvo.usuario.role },
    { expiresIn: '15m' }
  )

  return { accessToken: novoAccessToken }
}

export async function logout({ refreshToken }) {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  })
  return { message: 'Logout realizado com sucesso' }
}

export async function recuperarSenha({ email }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario) {
    return { message: 'Se o e-mail existir, você receberá as instruções em breve.' }
  }

  const token = Buffer.from(`${usuario.id}:${Date.now()}`).toString('base64')

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const link = `http://localhost:3000/reset-senha?token=${token}`

  await transporter.sendMail({
    from: `"Vyra CRM" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Recuperação de senha — Vyra CRM',
    html: `
      <h2>Recuperação de senha</h2>
      <p>Olá, ${usuario.nome}!</p>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${link}">${link}</a>
      <p>O link expira em 1 hora.</p>
    `,
  })

  return { message: 'Se o e-mail existir, você receberá as instruções em breve.' }
}

export async function perfil(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nome: true, email: true, role: true },
  })

  if (!usuario) {
    throw { statusCode: 404, message: 'Usuário não encontrado' }
  }

  return usuario
}