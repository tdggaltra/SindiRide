import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, NotFoundError } from '../../shared/errors/app.errors'

const rideInclude = {
  sindico: {
    include: {
      user: { select: { name: true, phone: true } },
    },
  },
} as const

export const motoristaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const motorista = await app.prisma.motorista.findUnique({
      where: { userId: req.user.sub },
      include: { user: { select: { name: true, email: true, phone: true } } },
    })
    if (!motorista) throw new NotFoundError('Motorista')
    return reply.send(motorista)
  })

  // Corridas AGENDADAS disponíveis para aceite (sem motorista atribuído)
  // Retorna [] se motorista estiver offline — deve ficar online para receber corridas
  app.get('/rides/pending', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { motoristaId } = req.user
    if (!motoristaId) throw new ForbiddenError('Perfil de motorista não encontrado')

    const motorista = await app.prisma.motorista.findUnique({
      where: { id: motoristaId },
      select: { isAvailable: true },
    })
    if (!motorista?.isAvailable) return reply.send([])

    const rides = await app.prisma.ride.findMany({
      where: { status: 'AGENDADA', motoristaId: null },
      orderBy: { scheduledAt: 'asc' },
      include: rideInclude,
    })
    return reply.send(rides)
  })

  // Corrida ativa do motorista (ACEITA ou EM_ANDAMENTO)
  app.get('/rides/active', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { motoristaId } = req.user
    if (!motoristaId) throw new ForbiddenError('Perfil de motorista não encontrado')
    const ride = await app.prisma.ride.findFirst({
      where: { motoristaId, status: { in: ['ACEITA', 'EM_ANDAMENTO'] } },
      include: rideInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return reply.send(ride ?? null)
  })

  // Corridas finalizadas ou canceladas do motorista (histórico)
  app.get('/rides/history', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string }
    const { motoristaId } = req.user
    if (!motoristaId) throw new ForbiddenError('Perfil de motorista não encontrado')
    const skip = (Number(page) - 1) * Number(limit)
    const [rides, total] = await Promise.all([
      app.prisma.ride.findMany({
        where: { motoristaId, status: { in: ['CONCLUIDA', 'CANCELADA'] } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
        include: rideInclude,
      }),
      app.prisma.ride.count({
        where: { motoristaId, status: { in: ['CONCLUIDA', 'CANCELADA'] } },
      }),
    ])
    return reply.send({ data: rides, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })

  app.patch('/availability', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { available } = z.object({ available: z.boolean() }).parse(req.body)
    await app.prisma.motorista.update({
      where: { userId: req.user.sub },
      data: { isAvailable: available, lastSeenAt: new Date() },
    })
    return reply.send({ available })
  })
}
