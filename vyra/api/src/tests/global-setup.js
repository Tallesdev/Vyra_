import { execSync } from 'node:child_process'
import { urlDoBancoDeTeste } from './banco-de-teste.js'

export default function () {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: urlDoBancoDeTeste() },
    stdio: 'inherit',
  })
}
