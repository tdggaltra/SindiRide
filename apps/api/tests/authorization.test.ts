import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { resetDb } from './helpers/db'
import { createSindico, createMotorista } from './helpers/factories'

async function loginAs(app: FastifyInstance, cpf: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf, password } })
  return res.json().accessToken as string
}

describe('Autorização por papel', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb(app.prisma)
  })

  it('síndico não pode chamar rota exclusiva de motorista (accept)', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/rides/id-qualquer/accept',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('motorista não pode chamar rota exclusiva de síndico (criar corrida)', async () => {
    const { user, password } = await createMotorista(app.prisma)
    const token = await loginAs(app, user.cpf, password)

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        originAddress: 'Rua A, 1', originDistrict: 'Centro', originLat: -23.31, originLng: -51.16,
        destAddress: 'Rua B, 2', destDistrict: 'Zona Sul', destLat: -23.33, destLng: -51.18,
        scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      },
    })

    expect(res.statusCode).toBe(403)
  })

  it('requisição sem token nas rotas de corrida retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/rides' })
    expect(res.statusCode).toBe(401)
  })
})
