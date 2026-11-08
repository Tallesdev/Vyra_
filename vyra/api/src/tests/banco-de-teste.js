export const NOME_BANCO_TESTE = 'vyra_test'

export function urlDoBancoDeTeste() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definido — rode os testes dentro do container: docker compose exec api npm test')
  }
  const url = new URL(process.env.DATABASE_URL)
  url.pathname = `/${NOME_BANCO_TESTE}`
  return url.toString()
}
