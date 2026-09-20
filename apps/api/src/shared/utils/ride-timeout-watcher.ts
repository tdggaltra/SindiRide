import { FastifyInstance } from 'fastify'
import { RideStatus, CancelledBy } from '@prisma/client'
import { notify } from './notifications'

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const GIVE_UP_LEAD_TIME_MS = 60 * 60 * 1000 // 1h

/**
 * Segunda rede de segurança pra corrida sem motorista, complementar ao
 * limite de cancelamentos em ride.routes.ts: aquele só age quando um
 * motorista aceita e desiste; esta pega o caso de ninguém sequer aceitar.
 * Cancela (SISTEMA) toda corrida AGENDADA sem motorista cujo horário está a
 * menos de 1h de distância — dá tempo do síndico perceber e reagendar em
 * vez de descobrir só na hora que ninguém vai aparecer.
 */
export async function cancelOverdueRides(app: FastifyInstance) {
  const cutoff = new Date(Date.now() + GIVE_UP_LEAD_TIME_MS)
  const overdue = await app.prisma.ride.findMany({
    where: { status: RideStatus.AGENDADA, motoristaId: null, scheduledAt: { lte: cutoff } },
    include: { sindico: { select: { userId: true } } },
  })

  for (const ride of overdue) {
    const reason = 'Cancelada automaticamente — nenhum motorista disponível a tempo'
    await app.prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: RideStatus.CANCELADA,
        cancelledAt: new Date(),
        cancelledBy: CancelledBy.SISTEMA,
        cancelReason: reason,
        statusHistory: { create: { status: RideStatus.CANCELADA, changedBy: 'sistema', note: reason } },
      },
    })
    app.io.to(`ride:${ride.id}`).to(`user:${ride.sindico.userId}`)
      .emit('ride:cancelled', { rideId: ride.id, status: RideStatus.CANCELADA, reason })
    notify(app.prisma, app.io, {
      userId: ride.sindico.userId,
      type: 'CORRIDA_CANCELADA',
      title: 'Não encontramos um motorista a tempo',
      body: 'Sua corrida foi cancelada automaticamente por falta de motorista disponível. Tente agendar novamente.',
      rideId: ride.id,
    }).catch(() => {})
    app.log.info({ rideId: ride.id }, 'Corrida cancelada automaticamente por falta de motorista')
  }
}

// Desligado em teste (VITEST=true) — os testes chamam cancelOverdueRides()
// diretamente com dados montados na mão, em vez de esperar um timer real.
export function startRideTimeoutWatcher(app: FastifyInstance) {
  if (process.env.VITEST === 'true') return

  const timer = setInterval(() => {
    cancelOverdueRides(app).catch(err => app.log.error(err, 'Falha ao checar corridas sem motorista'))
  }, CHECK_INTERVAL_MS)

  cancelOverdueRides(app).catch(err => app.log.error(err, 'Falha ao checar corridas sem motorista'))

  app.addHook('onClose', async () => { clearInterval(timer) })
}
