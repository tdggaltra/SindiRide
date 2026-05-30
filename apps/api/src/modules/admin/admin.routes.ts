import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NotFoundError, BadRequestError } from '../../shared/errors/app.errors'
import { UserStatus, RideStatus } from '@prisma/client'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminOnly = { onRequest: [app.authorize('ADMIN')] }

  app.get('/dashboard', adminOnly, async (_req, reply) => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [totalSindicos, pendingSindicos, totalMotoristas, activeRides, scheduledRides, availableDrivers, ridesThisMonth] = await Promise.all([
      app.prisma.user.count({ where: { role: 'SINDICO', status: 'ATIVO' } }),
      app.prisma.user.count({ where: { role: 'SINDICO', status: 'PENDENTE' } }),
      app.prisma.motorista.count({ where: { user: { status: 'ATIVO' } } }),
      app.prisma.ride.count({ where: { status: RideStatus.EM_ANDAMENTO } }),
      app.prisma.ride.count({ where: { status: RideStatus.AGENDADA } }),
      app.prisma.motorista.count({ where: { isAvailable: true } }),
      app.prisma.ride.count({ where: { createdAt: { gte: monthStart } } }),
    ])
    return reply.send({
      sindicos:   { total: totalSindicos, pending: pendingSindicos },
      motoristas: { total: totalMotoristas, available: availableDrivers },
      rides:      { active: activeRides, scheduled: scheduledRides, thisMonth: ridesThisMonth },
    })
  })

  app.get('/sindicos/pending', adminOnly, async (_req, reply) => {
    const users = await app.prisma.user.findMany({
      where: { role: 'SINDICO', status: UserStatus.PENDENTE },
      include: { sindico: true },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send(users)
  })

  app.get('/sindicos', adminOnly, async (req, reply) => {
    const { status, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where = status ? { role: 'SINDICO' as const, status } : { role: 'SINDICO' as const }
    const [users, total] = await Promise.all([
      app.prisma.user.findMany({ where, include: { sindico: true }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      app.prisma.user.count({ where }),
    ])
    return reply.send({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })

  app.patch('/sindicos/:userId/approve', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Usuário')
    if (user.status !== UserStatus.PENDENTE) throw new BadRequestError('Cadastro não está pendente')
    const updated = await app.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ATIVO, approvedById: req.user.sub, approvedAt: new Date() },
    })
    await app.prisma.notification.create({ data: { userId, type: 'CADASTRO_APROVADO', title: 'Cadastro aprovado!', body: 'Você já pode agendar corridas.' } })
    return reply.send(updated)
  })

  app.patch('/sindicos/:userId/reject', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body)
    await app.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.REJEITADO, approvedById: req.user.sub, approvedAt: new Date() } })
    await app.prisma.notification.create({ data: { userId, type: 'CADASTRO_REJEITADO', title: 'Cadastro não aprovado', body: reason } })
    return reply.send({ message: 'Cadastro rejeitado' })
  })

  app.patch('/users/:userId/block', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    await app.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BLOQUEADO } })
    await app.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    return reply.send({ message: 'Usuário bloqueado' })
  })

  app.get('/rides', adminOnly, async (req, reply) => {
    const { status, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where = status ? { status } : {}
    const [rides, total] = await Promise.all([
      app.prisma.ride.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip, take: Number(limit),
        include: {
          sindico:   { include: { user: { select: { name: true } } } },
          motorista: { include: { user: { select: { name: true } } } },
        } }),
      app.prisma.ride.count({ where }),
    ])
    return reply.send({ rides, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })
}
