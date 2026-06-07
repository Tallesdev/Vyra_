import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const adminExistente = await prisma.usuario.findFirst({
    where: { role: 'ADMIN' },
  })

  if (adminExistente) {
    console.log('✅ Admin já existe, pulando seed.')
    return
  }

  const senhaHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@vyra.com',
      senha: senhaHash,
      role: 'ADMIN',
    },
  })

  console.log(`✅ Admin criado: ${admin.email} / senha: admin123`)
  console.log('⚠️  Troque a senha após o primeiro login!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })