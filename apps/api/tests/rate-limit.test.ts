import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * Os limites de /login e /register em auth.routes.ts são relaxados quando
 * process.env.VITEST === 'true' (senão os outros testes, que fazem dezenas
 * de logins de negócio no mesmo "IP" do app.inject, tomariam 429 sem relação
 * com força bruta). Para validar o limite real de produção, este arquivo
 * remove VITEST temporariamente e reimporta o app antes de construir sua
 * própria instância isolada — sem afetar os demais arquivos de teste.
 */
describe('Rate limit em /login (comportamento de produção)', () => {
  let app: FastifyInstance
  const originalVitestFlag = process.env.VITEST

  beforeAll(async () => {
    delete process.env.VITEST
    vi.resetModules()
    const { buildApp } = await import('../src/app')
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
    process.env.VITEST = originalVitestFlag
    vi.resetModules()
  })

  it('permite até 5 tentativas por minuto e bloqueia a 6ª com 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { cpf: '00000000000', password: 'senha-errada' },
      })
      // Credenciais inválidas, mas ainda dentro do limite de tentativas
      expect(res.statusCode).toBe(401)
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: '00000000000', password: 'senha-errada' },
    })

    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().code).toBe('TOO_MANY_REQUESTS')
  })
})
