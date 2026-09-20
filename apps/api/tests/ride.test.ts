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

// Não há mais corrida imediata — toda corrida precisa de pelo menos 5h de
// antecedência (ver MIN_LEAD_TIME_MS em ride.routes.ts). 6h dá folga segura
// contra flakiness de tempo de execução do teste.
const validScheduledAt = () => new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

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

    const created = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(sindicoToken),
      payload: { ...rideBasePayload, scheduledAt: validScheduledAt() },
    })

    return { rideId: created.json().id as string, sindicoToken, motoristaToken }
  }

  it('síndico cria corrida agendada com sucesso', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt: validScheduledAt() },
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
      payload: { ...rideBasePayload, scheduledAt },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejeita agendamento com menos de 5 horas de antecedência', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

    const res = await app.inject({
      method: 'POST',
      url: '/api/rides',
      headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejeita segunda corrida ativa do mesmo síndico', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    const scheduledAt = validScheduledAt()

    const first = await app.inject({
      method: 'POST', url: '/api/rides', headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt },
    })
    expect(first.statusCode).toBe(201)

    const second = await app.inject({
      method: 'POST', url: '/api/rides', headers: auth(token),
      payload: { ...rideBasePayload, scheduledAt },
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

  it('motorista cancela corrida aceita: reabre pro pool em vez de cancelar de vez', async () => {
    const { rideId, motoristaToken } = await createScheduledRide()
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })

    const cancelled = await app.inject({
      method: 'PATCH', url: `/api/rides/${rideId}/cancel`, headers: auth(motoristaToken), payload: {},
    })
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json().status).toBe('AGENDADA')
    expect(cancelled.json().motoristaId).toBeNull()

    // outro motorista consegue ver e aceitar a corrida reaberta
    const { user: otherUser, password: otherPassword } = await createMotorista(app.prisma)
    const otherToken = await loginAs(app, otherUser.cpf, otherPassword)
    const accepted = await app.inject({
      method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(otherToken),
    })
    expect(accepted.statusCode).toBe(200)
  })

  it('desiste e cancela de vez após 3 motoristas cancelarem a mesma corrida', async () => {
    const { rideId, sindicoToken } = await createScheduledRide()

    for (let i = 0; i < 3; i++) {
      const { user, password } = await createMotorista(app.prisma)
      const token = await loginAs(app, user.cpf, password)
      await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(token) })
      const res = await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/cancel`, headers: auth(token), payload: {} })

      if (i < 2) {
        expect(res.statusCode).toBe(200)
        expect(res.json().status).toBe('AGENDADA')
      } else {
        expect(res.statusCode).toBe(200)
        expect(res.json().status).toBe('CANCELADA')
        expect(res.json().cancelledBy).toBe('SISTEMA')
      }
    }

    const final = await app.inject({ method: 'GET', url: `/api/rides/${rideId}`, headers: auth(sindicoToken) })
    expect(final.json().status).toBe('CANCELADA')
  })

  it('motorista não pode cancelar corrida que não é dele', async () => {
    const { rideId, motoristaToken } = await createScheduledRide()
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })

    const { user: otherUser, password: otherPassword } = await createMotorista(app.prisma)
    const otherToken = await loginAs(app, otherUser.cpf, otherPassword)
    const res = await app.inject({
      method: 'PATCH', url: `/api/rides/${rideId}/cancel`, headers: auth(otherToken), payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  it('síndico não pode cancelar corrida de outro síndico', async () => {
    const { rideId } = await createScheduledRide()
    const { user: otherSindico, password: otherPassword } = await createSindico(app.prisma)
    const otherToken = await loginAs(app, otherSindico.cpf, otherPassword)
    const res = await app.inject({
      method: 'PATCH', url: `/api/rides/${rideId}/cancel`, headers: auth(otherToken), payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET /:id traz vínculo, verificação e corridas realizadas do motorista', async () => {
    const { rideId, sindicoToken, motoristaToken } = await createScheduledRide()
    await app.inject({ method: 'PATCH', url: `/api/rides/${rideId}/accept`, headers: auth(motoristaToken) })

    const res = await app.inject({ method: 'GET', url: `/api/rides/${rideId}`, headers: auth(sindicoToken) })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.motorista).toHaveProperty('affiliation')
    expect(body.motorista).toHaveProperty('documentsVerifiedAt')
    expect(body.motorista.completedRidesCount).toBe(0)
    expect(body.motorista.user).toHaveProperty('avatarUrl')
    expect(body.motorista.user).toHaveProperty('createdAt')
  })
})
