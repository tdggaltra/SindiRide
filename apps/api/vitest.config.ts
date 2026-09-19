import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Os testes compartilham um único banco Postgres real e cada arquivo
    // limpa as tabelas entre os testes — rodar arquivos em paralelo faz um
    // arquivo apagar dados que outro está usando no mesmo instante.
    fileParallelism: false,
  },
})
