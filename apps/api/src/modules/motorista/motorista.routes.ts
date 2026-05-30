import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NotFoundError } from '../../shared/errors/app.errors'

export const motoristaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const motorista = await app.prisma.motorista.findUnique({
      where: { userId: req.user.sub },
      include: { user: { select: { name: true, email: true, phone: true } } },
    })
    if (!motorista) throw new NotFoundError('Motorista')
    return reply.send(motorista)
  })

  app.get('/rides/pending', { onRequest: [app.authorize('MOTORISTA')] }, async (_req, reply) => {
    const rides = await app.prisma.ride.findMany({
      where: { status: 'AGENDADA', motoristaId: null, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      include: { sindico: { include: { user: { select: { name: true } } } } },
    })
    return reply.send(rides)
  })

  app.patch('/availability', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { available } = z.object({ available: z.boolean() }).parse(req.body)
    await app.prisma.motorista.update({ where: { userId: req.user.sub }, data: { isAvailable: available, lastSeenAt: new Date() } })
    return reply.send({ available })
  })
}
