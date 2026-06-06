import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/app.errors'
import { UserStatus, RideStatus, Role } from '@prisma/client'
import { hash } from 'bcryptjs'
import { notify } from '../../shared/utils/notifications'

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
    const where = {
      role: 'SINDICO' as const,
      deletedAt: null,
      ...(status ? { status } : {}),
    }
    const [users, total] = await Promise.all([
      app.prisma.user.findMany({ where, include: { sindico: true }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      app.prisma.user.count({ where }),
    ])
    return reply.send({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })

  app.patch('/sindicos/:userId/block', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Usuário')
    const newStatus = user.status === UserStatus.BLOQUEADO ? UserStatus.ATIVO : UserStatus.BLOQUEADO
    await app.prisma.user.update({ where: { id: userId }, data: { status: newStatus } })
    if (newStatus === UserStatus.BLOQUEADO) {
      await app.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    }
    return reply.send({ status: newStatus })
  })

  app.delete('/sindicos/:userId', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Usuário')
    const suffix = `_deleted_${Date.now()}`
    await app.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: UserStatus.BLOQUEADO,
        email: `${user.email}${suffix}`,
        cpf:   `${user.cpf}${suffix}`,
      },
    })
    await app.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    return reply.send({ message: 'Síndico removido' })
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
    await notify(app.prisma, app.io, { userId, type: 'CADASTRO_APROVADO', title: 'Cadastro aprovado!', body: 'Você já pode agendar corridas.' })
    return reply.send(updated)
  })

  app.patch('/sindicos/:userId/reject', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body)
    await app.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.REJEITADO, approvedById: req.user.sub, approvedAt: new Date() } })
    await notify(app.prisma, app.io, { userId, type: 'CADASTRO_REJEITADO', title: 'Cadastro não aprovado', body: reason })
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

  // ── Motoristas ────────────────────────────────────────────────────────────

  app.get('/motoristas', adminOnly, async (req, reply) => {
    const { page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where = { user: { deletedAt: null } }
    const [motoristas, total] = await Promise.all([
      app.prisma.motorista.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, phone: true, status: true, cpf: true, createdAt: true } } },
        orderBy: { user: { createdAt: 'desc' } },
        skip,
        take: Number(limit),
      }),
      app.prisma.motorista.count({ where }),
    ])
    return reply.send({ motoristas, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  })

  app.delete('/motoristas/:userId', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Motorista')
    const suffix = `_deleted_${Date.now()}`
    await app.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: UserStatus.BLOQUEADO,
        email: `${user.email}${suffix}`,
        cpf:   `${user.cpf}${suffix}`,
      },
    })
    await Promise.all([
      app.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      app.prisma.motorista.update({ where: { userId }, data: { isAvailable: false } }),
    ])
    return reply.send({ message: 'Motorista removido' })
  })

  app.post('/motoristas', adminOnly, async (req, reply) => {
    const schema = z.object({
      name:         z.string().min(3),
      email:        z.string().email(),
      cpf:          z.string().min(11),
      phone:        z.string().min(10),
      password:     z.string().min(8),
      vehicleBrand: z.string().min(1),
      vehicleModel: z.string().min(1),
      vehicleColor: z.string().min(1),
      vehiclePlate: z.string().min(7),
      vehicleYear:  z.coerce.number().int().min(2000),
      cnhNumber:    z.string().min(1),
      cnhCategory:  z.string().min(1),
      cnhExpiry:    z.coerce.date(),
    })
    const data = schema.parse(req.body)

    const existing = await app.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { cpf: data.cpf }] },
    })
    if (existing?.email === data.email) throw new ConflictError('E-mail já cadastrado')
    if (existing?.cpf  === data.cpf)   throw new ConflictError('CPF já cadastrado')

    const passwordHash = await hash(data.password, 10)
    const user = await app.prisma.user.create({
      data: {
        name: data.name, email: data.email, cpf: data.cpf,
        phone: data.phone, password: passwordHash,
        role: Role.MOTORISTA, status: UserStatus.ATIVO,
        approvedById: req.user.sub, approvedAt: new Date(),
        motorista: {
          create: {
            vehicleBrand: data.vehicleBrand, vehicleModel: data.vehicleModel,
            vehicleColor: data.vehicleColor, vehiclePlate: data.vehiclePlate,
            vehicleYear:  data.vehicleYear,  cnhNumber:    data.cnhNumber,
            cnhCategory:  data.cnhCategory,  cnhExpiry:    data.cnhExpiry,
          },
        },
      },
    })
    return reply.status(201).send({ message: 'Motorista cadastrado', userId: user.id })
  })

  app.patch('/motoristas/:userId/block', adminOnly, async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const user = await app.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Motorista')
    const newStatus = user.status === UserStatus.BLOQUEADO ? UserStatus.ATIVO : UserStatus.BLOQUEADO
    await app.prisma.user.update({ where: { id: userId }, data: { status: newStatus } })
    if (newStatus === UserStatus.BLOQUEADO) {
      await app.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    }
    return reply.send({ status: newStatus })
  })

  // ── Rotas sugeridas ───────────────────────────────────────────────────────

  app.get('/routes', adminOnly, async (_req, reply) => {
    const routes = await app.prisma.route.findMany({ orderBy: [{ isPopular: 'desc' }, { name: 'asc' }] })
    return reply.send(routes)
  })

  app.post('/routes', adminOnly, async (req, reply) => {
    const schema = z.object({
      name:      z.string().min(3),
      category:  z.string().optional(),
      address:   z.string().min(3),
      district:  z.string().min(2),
      lat:       z.number(),
      lng:       z.number(),
      isPopular: z.boolean().default(false),
    })
    const data = schema.parse(req.body)
    const route = await app.prisma.route.create({ data })
    return reply.status(201).send(route)
  })

  app.patch('/routes/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const schema = z.object({
      name:      z.string().min(3).optional(),
      category:  z.string().optional(),
      address:   z.string().min(3).optional(),
      district:  z.string().min(2).optional(),
      lat:       z.number().optional(),
      lng:       z.number().optional(),
      isPopular: z.boolean().optional(),
      isActive:  z.boolean().optional(),
    })
    const data = schema.parse(req.body)
    const route = await app.prisma.route.findUnique({ where: { id } })
    if (!route) throw new NotFoundError('Rota')
    const updated = await app.prisma.route.update({ where: { id }, data })
    return reply.send(updated)
  })

  app.delete('/routes/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const route = await app.prisma.route.findUnique({ where: { id } })
    if (!route) throw new NotFoundError('Rota')
    await app.prisma.route.update({ where: { id }, data: { isActive: false } })
    return reply.send({ message: 'Rota desativada' })
  })
}
