import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { RideStatus } from '@prisma/client'
import { buildApp } from '../src/app'
import { resetDb } from './helpers/db'
import { createSindico, createMotorista } from './helpers/factories'
import { cancelOverdueRides } from '../src/shared/utils/ride-timeout-watcher'

// clientDistanceKm/clientDurationMin evitam a chamada real ao OSRM na criação da corrida
const rideBase = {
  originAddress: 'Rua A, 1', originDistrict: 'Centro', originLat: -23.31, originLng: -51.16,
  destAddress: 'Rua B, 2', destDistrict: 'Zona Sul', destLat: -23.33, destLng: -51.18,
}

describe('cancelOverdueRides (segunda rede de segurança — sem motorista a tempo)', () => {
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

  it('cancela corrida AGENDADA sem motorista a menos de 1h do horário', async () => {
    const { sindico } = await createSindico(app.prisma)
    const ride = await app.prisma.ride.create({
      data: {
        ...rideBase,
        sindicoId: sindico.id,
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30min — dentro do corte de 1h
        status: RideStatus.AGENDADA,
      },
    })

    await cancelOverdueRides(app)

    const updated = await app.prisma.ride.findUnique({ where: { id: ride.id } })
    expect(updated?.status).toBe('CANCELADA')
    expect(updated?.cancelledBy).toBe('SISTEMA')
    expect(updated?.cancelReason).toMatch(/nenhum motorista disponível/i)
  })

  it('não mexe em corrida AGENDADA ainda dentro da janela segura', async () => {
    const { sindico } = await createSindico(app.prisma)
    const ride = await app.prisma.ride.create({
      data: {
        ...rideBase,
        sindicoId: sindico.id,
        scheduledAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3h — fora do corte
        status: RideStatus.AGENDADA,
      },
    })

    await cancelOverdueRides(app)

    const updated = await app.prisma.ride.findUnique({ where: { id: ride.id } })
    expect(updated?.status).toBe('AGENDADA')
  })

  it('não mexe em corrida que já tem motorista, mesmo perto da hora', async () => {
    const { sindico } = await createSindico(app.prisma)
    const { motorista } = await createMotorista(app.prisma)
    const ride = await app.prisma.ride.create({
      data: {
        ...rideBase,
        sindicoId: sindico.id,
        motoristaId: motorista.id,
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
        status: RideStatus.ACEITA,
      },
    })

    await cancelOverdueRides(app)

    const updated = await app.prisma.ride.findUnique({ where: { id: ride.id } })
    expect(updated?.status).toBe('ACEITA')
  })
})
