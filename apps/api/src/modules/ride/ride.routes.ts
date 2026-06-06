import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, BadRequestError, UnprocessableError } from '../../shared/errors/app.errors'
import { RideStatus, CancelledBy } from '@prisma/client'
import { calculateRoute } from '../../shared/utils/maps.service'
import { notify } from '../../shared/utils/notifications'

export const rideRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { onRequest: [app.authorize('SINDICO')] }, async (req, reply) => {
    const schema = z.object({
      originAddress: z.string().min(1), originDistrict: z.string(), originLat: z.number(), originLng: z.number(),
      destAddress:   z.string().min(1, 'Informe o endereço de destino'),
      destDistrict:  z.string(),
      destLat:       z.number().refine((v: number) => v !== 0, 'Selecione um destino válido'),
      destLng:       z.number().refine((v: number) => v !== 0, 'Selecione um destino válido'),
      scheduledAt: z.coerce.date(), isImmediate: z.boolean().default(false), notes: z.string().optional(),
    })
    const data = schema.parse(req.body)
    const { sindicoId } = req.user
    if (!sindicoId) throw new ForbiddenError('Perfil de síndico não encontrado')

    // Corridas imediatas usam o horário do servidor para evitar rejeição por drift de relógio
    if (data.isImmediate) {
      data.scheduledAt = new Date()
    } else {
      // Agendamento: tolera até 1 minuto de diferença de relógio entre cliente e servidor
      const oneMinuteAgo = new Date(Date.now() - 60_000)
      if (data.scheduledAt < oneMinuteAgo) {
        throw new BadRequestError('Não é possível agendar para datas passadas')
      }
    }
    const active = await app.prisma.ride.findFirst({
      where: { sindicoId, status: { in: [RideStatus.AGENDADA, RideStatus.ACEITA, RideStatus.EM_ANDAMENTO] } },
    })
    if (active) throw new UnprocessableError('Você já possui uma corrida ativa')

    const routeInfo = await calculateRoute(
      { lat: data.originLat, lng: data.originLng },
      { lat: data.destLat, lng: data.destLng },
    )

    const ride = await app.prisma.ride.create({
      data: {
        sindicoId,
        ...data,
        status: RideStatus.AGENDADA,
        estimatedDistanceKm: routeInfo?.distanceKm ?? null,
        estimatedDurationMin: routeInfo?.durationMin ?? null,
        polyline: routeInfo?.polyline ?? null,
        statusHistory: { create: { status: RideStatus.AGENDADA, note: 'Criada pelo síndico' } },
      },
    })
    return reply.status(201).send(ride)
  })

  app.get('/', { onRequest: [app.authorize('SINDICO')] }, async (req, reply) => {
    const { page = '1', limit = '10' } = req.query as any
    const { sindicoId } = req.user
    if (!sindicoId) throw new ForbiddenError('Perfil de síndico não encontrado')
    const skip = (Number(page) - 1) * Number(limit)
    const [rides, total] = await Promise.all([
      app.prisma.ride.findMany({ where: { sindicoId }, orderBy: { scheduledAt: 'desc' }, skip, take: Number(limit),
        include: { motorista: { include: { user: { select: { name: true, phone: true } } } } } }),
      app.prisma.ride.count({ where: { sindicoId } }),
    ])
    return reply.send({ data: rides, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })

  app.get('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const ride = await app.prisma.ride.findUnique({
      where: { id },
      include: {
        sindico: { include: { user: { select: { name: true, phone: true } } } },
        motorista: { include: { user: { select: { name: true, phone: true } } } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    })
    if (!ride) throw new NotFoundError('Corrida')
    return reply.send(ride)
  })

  app.patch('/:id/accept', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { motoristaId } = req.user
    if (!motoristaId) throw new ForbiddenError('Perfil de motorista não encontrado')
    const ride = await app.prisma.ride.findUnique({
      where: { id },
      include: { sindico: { select: { userId: true } } },
    })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.AGENDADA) throw new UnprocessableError('Corrida não disponível para aceite')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { motoristaId, status: RideStatus.ACEITA, acceptedAt: new Date(),
        statusHistory: { create: { status: RideStatus.ACEITA, changedBy: motoristaId } } },
    })
    app.io.to(`ride:${id}`).to(`user:${ride.sindico.userId}`).emit('ride:accepted', { rideId: id, status: RideStatus.ACEITA })
    notify(app.prisma, app.io, {
      userId: ride.sindico.userId,
      type: 'CORRIDA_ACEITA',
      title: 'Motorista a caminho!',
      body: 'Seu pedido foi aceito. O motorista está se deslocando até você.',
      rideId: id,
    }).catch(() => {})
    return reply.send(updated)
  })

  app.patch('/:id/start', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const ride = await app.prisma.ride.findUnique({
      where: { id },
      include: { sindico: { select: { userId: true } } },
    })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.ACEITA) throw new UnprocessableError('Corrida precisa estar aceita')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.EM_ANDAMENTO, startedAt: new Date(),
        statusHistory: { create: { status: RideStatus.EM_ANDAMENTO, changedBy: req.user.sub } } },
    })
    app.io.to(`ride:${id}`).to(`user:${ride.sindico.userId}`).emit('ride:started', { rideId: id, status: RideStatus.EM_ANDAMENTO })
    notify(app.prisma, app.io, {
      userId: ride.sindico.userId,
      type: 'CORRIDA_INICIADA',
      title: 'Corrida iniciada',
      body: 'O motorista chegou à origem. Corrida em andamento.',
      rideId: id,
    }).catch(() => {})
    return reply.send(updated)
  })

  app.patch('/:id/finish', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const ride = await app.prisma.ride.findUnique({
      where: { id },
      include: { sindico: { select: { userId: true } } },
    })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.EM_ANDAMENTO) throw new UnprocessableError('Corrida não está em andamento')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.CONCLUIDA, finishedAt: new Date(),
        statusHistory: { create: { status: RideStatus.CONCLUIDA, changedBy: req.user.sub } } },
    })
    app.io.to(`ride:${id}`).to(`user:${ride.sindico.userId}`).emit('ride:finished', { rideId: id, status: RideStatus.CONCLUIDA })
    notify(app.prisma, app.io, {
      userId: ride.sindico.userId,
      type: 'CORRIDA_CONCLUIDA',
      title: 'Corrida concluída!',
      body: 'Você chegou ao destino. Boa reunião!',
      rideId: id,
    }).catch(() => {})
    return reply.send(updated)
  })

  app.patch('/:id/cancel', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body)
    const ride = await app.prisma.ride.findUnique({
      where: { id },
      include: { sindico: { select: { userId: true } }, motorista: { select: { userId: true } } },
    })
    if (!ride) throw new NotFoundError('Corrida')
    if (![RideStatus.AGENDADA, RideStatus.ACEITA].includes(ride.status)) throw new UnprocessableError('Corrida não pode ser cancelada')
    let cancelledBy: CancelledBy = CancelledBy.ADMIN
    if (req.user.role === 'SINDICO')   cancelledBy = CancelledBy.SINDICO
    if (req.user.role === 'MOTORISTA') cancelledBy = CancelledBy.MOTORISTA
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.CANCELADA, cancelledAt: new Date(), cancelledBy, cancelReason: reason,
        statusHistory: { create: { status: RideStatus.CANCELADA, changedBy: req.user.sub, note: reason } } },
    })
    const targets = app.io.to(`ride:${id}`).to(`user:${ride.sindico.userId}`)
    if (ride.motorista) targets.to(`user:${ride.motorista.userId}`)
    targets.emit('ride:cancelled', { rideId: id, status: RideStatus.CANCELADA, reason })
    if (cancelledBy === CancelledBy.MOTORISTA) {
      notify(app.prisma, app.io, {
        userId: ride.sindico.userId,
        type: 'CORRIDA_CANCELADA',
        title: 'Corrida cancelada',
        body: 'O motorista cancelou a corrida. Tente agendar novamente.',
        rideId: id,
      }).catch(() => {})
    } else if (cancelledBy === CancelledBy.SINDICO && ride.motorista) {
      notify(app.prisma, app.io, {
        userId: ride.motorista.userId,
        type: 'CORRIDA_CANCELADA',
        title: 'Corrida cancelada',
        body: 'O síndico cancelou a corrida.',
        rideId: id,
      }).catch(() => {})
    }
    return reply.send(updated)
  })

  app.post('/:id/rate', { onRequest: [app.authorize('SINDICO')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { rating, comment } = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().optional() }).parse(req.body)
    const ride = await app.prisma.ride.findUnique({ where: { id } })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.CONCLUIDA) throw new UnprocessableError('Só é possível avaliar corridas concluídas')
    if (ride.rating) throw new UnprocessableError('Corrida já avaliada')
    await app.prisma.ride.update({ where: { id }, data: { rating, ratingComment: comment, ratedAt: new Date() } })
    if (ride.motoristaId) {
      const stats = await app.prisma.ride.aggregate({ where: { motoristaId: ride.motoristaId, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } })
      await app.prisma.motorista.update({ where: { id: ride.motoristaId }, data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count.rating } })
    }
    return reply.send({ message: 'Avaliação registrada' })
  })
}
