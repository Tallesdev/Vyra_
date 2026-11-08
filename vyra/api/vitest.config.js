import { defineConfig } from 'vitest/config'
import { urlDoBancoDeTeste } from './src/tests/banco-de-teste.js'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    globalSetup: './src/tests/global-setup.js',
    env: { DATABASE_URL: urlDoBancoDeTeste() },
  },
})
