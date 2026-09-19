import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { resetDb } from './helpers/db'
import { createSindico, createMotorista } from './helpers/factories'

async function loginAs(app: FastifyInstance, cpf: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf, password } })
  return res.json().accessToken as string
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

// clientDistanceKm/clientDurationMin evitam a chamada real ao OSRM na criação da corrida
const rideBasePayload = {
  originAddress: 'Rua A, 1', originDistrict: 'Centro', originLat: -23.31, originLng: -51.16,
  destAddress: 'Rua B, 2', destDistrict: 'Zona Sul', destLat: -23.33, destLng: -51.18,
  clientDistanceKm: 5, clientDurationMin: 12,
}

describe('Rides', () => {
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

  async function createScheduledRide() {
    const { user: sindicoUser, password: sindicoPassword } = await createSindico(app.prisma)
    const { user: motoristaUser, password: motoristaPassword } = await createMotorista(app.prisma)
    const sindicoToken = await loginAs(app, sindicoUser.cpf, sindicoPassword)
    const motoristaToken = await loginAs(app, motoristaUser.cpf, motoristaPassword)

    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const created = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(sindicoToken),
      payload: { ...rideBasePayload, scheduledAt, isImmediate: false },
    })

    return { rideId: created.json().id as string, sindicoToken, motoristaToken }
  }

  it('síndico cria corrida agendada com sucesso', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt, isImmediate: false },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('AGENDADA')
  })

  it('rejeita scheduledAt no passado', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const scheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt, isImmediate: false },
    })

    expect(res.statusCode).toBe(400)
  })

  it('isImmediate ignora o scheduledAt enviado pelo cliente e usa o horário do servidor', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const bogusPast = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt: bogusPast, isImmediate: true },
    })

    expect(res.statusCode).toBe(201)
    const scheduledAt = new Date(res.json().scheduledAt).getTime()
    expect(scheduledAt).toBeGreaterThan(Date.now() - 5_000)
  })

  it('rejeita segunda corrida ativa do mesmo síndico', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const first = await app.inject({
      method: 'POST', url: '/api/rides', headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt, isImmediate: false },
    })
    expect(first.statusCode).toBe(201)

    const second = await app.inject({
      method: 'POST', url: '/api/rides', headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt, isImmediate: false },
    })
    expect(second.statusCode).toBe(422)
  })

  it('accept exige status AGENDADA', async () => {
    const { rideId, motoristaToken } = await createScheduledRide()

    const accepted = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })
    expect(accepted.statusCode).toBe(200)
    expect(accepted.json().status).toBe('ACEITA')

    const acceptAgain = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })
    expect(acceptAgain.statusCode).toBe(422)
  })

  it('start exige status ACEITA', async () => {
    const { rideId, motoristaToken } = await createScheduledRide()

    const startBeforeAccept = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/start`, headers: auth(motoristaToken) })
    expect(startBeforeAccept.statusCode).toBe(422)

    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })
    const started = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/start`, headers: auth(motoristaToken) })
    expect(started.statusCode).toBe(200)
    expect(started.json().status).toBe('EM_ANDAMENTO')
  })

  it('finish exige status EM_ANDAMENTO', async () => {
    const { rideId, motoristaToken } = await createScheduledRide()
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })

    const finishBeforeStart = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/finish`, headers: auth(motoristaToken) })
    expect(finishBeforeStart.statusCode).toBe(422)

    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/start`, headers: auth(motoristaToken) })
    const finished = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/finish`, headers: auth(motoristaToken) })
    expect(finished.statusCode).toBe(200)
    expect(finished.json().status).toBe('CONCLUIDA')
  })

  it('ciclo completo accept → start → finish → rate, e não permite avaliar duas vezes', async () => {
    const { rideId, sindicoToken, motoristaToken } = await createScheduledRide()

    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/start`, headers: auth(motoristaToken) })
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/finish`, headers: auth(motoristaToken) })

    const rated = await app.inject({
      method: 'POST', url: `/api/rides/${rideId}/rate`, headers: auth(sindicoToken), payload: { rating: 5 },
    })
    expect(rated.statusCode).toBe(200)

    const rateAgain = await app.inject({
      method: 'POST', url: `/api/rides/${rideId}/rate`, headers: auth(sindicoToken), payload: { rating: 4 },
    })
    expect(rateAgain.statusCode).toBe(422)
  })

  it('cancel só é permitido em AGENDADA ou ACEITA', async () => {
    const { rideId, sindicoToken, motoristaToken } = await createScheduledRide()
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/start`, headers: auth(motoristaToken) })

    const cancelled = await app.inject({
      method: 'PATCH', url: `/api/rides/${rideId}/cancel`, headers: auth(sindicoToken), payload: {},
    })
    expect(cancelled.statusCode).toBe(422)
  })
})
