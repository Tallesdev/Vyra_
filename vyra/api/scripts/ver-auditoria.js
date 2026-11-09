// Mostra as últimas linhas da auditoria. Uso: node scripts/ver-auditoria.js [quantidade]
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGODB_URL)

const quantidade = Number(process.argv[2] ?? 15)
const linhas = await mongoose.connection.db
  .collection('auditoria')
  .find()
  .sort({ createdAt: -1 })
  .limit(quantidade)
  .toArray()

for (const l of linhas.reverse()) {
  const hora = l.createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const quem = l.papel ?? l.email ?? (l.metodo ? 'anônimo' : 'sistema')
  console.log(`${hora}  ${String(l.status ?? '-').padEnd(4)} ${quem.padEnd(24)} ${l.acao}`)
}

await mongoose.disconnect()
