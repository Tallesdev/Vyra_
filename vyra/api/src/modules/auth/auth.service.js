import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { randomUUID, randomBytes, createHash } from 'node:crypto'



const prisma = new PrismaClient()

const VALIDADE_TOKEN_RECUPERACAO_MS = 60 * 60 * 1000 // 1 hora

// O token vai por e-mail; no banco fica só o hash. Quem ler o banco não consegue usar os links.
function hashDoToken(token) {
  return createHash('sha256').update(token).digest('hex')
}


export async function login({ email, senha }, jwt) {
  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })

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
    { id: usuario.id, type: 'refresh', jti: randomUUID()  },
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
  if (!refreshToken) {
    throw { statusCode: 401, message: 'Sessão não encontrada' }
  }

  const tokenSalvo = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { usuario: true },
  })

  if (!tokenSalvo || tokenSalvo.expiresAt < new Date() || !tokenSalvo.usuario.ativo) {
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

  const { usuario } = tokenSalvo
  const novoAccessToken = jwt.sign(
    { id: usuario.id, role: usuario.role },
    { expiresIn: '15m' }
  )

  return {
    accessToken: novoAccessToken,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
  }
}


export async function logout({ refreshToken }) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }
  return { message: 'Logout realizado com sucesso' }
}


export async function recuperarSenha({ email }) {
  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!usuario || !usuario.ativo) {
    return { message: 'Se o e-mail existir, você receberá as instruções em breve.' }
  }

  const token = randomBytes(32).toString('hex')

  // Um pedido novo substitui o anterior: só o link mais recente funciona.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      tokenRecuperacaoHash: hashDoToken(token),
      tokenRecuperacaoExpira: new Date(Date.now() + VALIDADE_TOKEN_RECUPERACAO_MS),
    },
  })


  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const link = `${process.env.FRONTEND_URL}/reset-senha?token=${token}`

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
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

export async function redefinirSenha({ token, senha }) {
  const usuario = await prisma.usuario.findUnique({
    where: { tokenRecuperacaoHash: hashDoToken(token) },
  })

  const expirado = !usuario?.tokenRecuperacaoExpira || usuario.tokenRecuperacaoExpira < new Date()
  if (!usuario || !usuario.ativo || expirado) {
    throw { statusCode: 400, message: 'Link de recuperação inválido ou expirado. Peça um novo na tela de login.' }
  }

  const senhaHash = await bcrypt.hash(senha, 10)

  // Tudo ou nada: troca a senha, invalida o link (uso único) e derruba as sessões abertas.
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: senhaHash, tokenRecuperacaoHash: null, tokenRecuperacaoExpira: null },
    }),
    prisma.refreshToken.deleteMany({ where: { usuarioId: usuario.id } }),
  ])

  return { message: 'Senha redefinida com sucesso. Entre com a nova senha.' }
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