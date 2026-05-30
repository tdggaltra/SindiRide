#!/bin/bash
set -e
echo "🚀 Criando arquivos da API..."

# ── config/env.ts ──────────────────────────────────────────────────────────
cat > apps/api/src/config/env.ts << 'EOF'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:    z.enum(['development', 'test', 'production']).default('development'),
  PORT:        z.coerce.number().default(3333),
  DATABASE_URL: z.string(),
  REDIS_URL:    z.string().optional(),
  JWT_SECRET:          z.string().default('sindiride_jwt_secret_chave_super_segura_32chars'),
  JWT_EXPIRES_IN:      z.string().default('15m'),
  JWT_REFRESH_SECRET:  z.string().default('sindiride_refresh_secret_chave_super_segura_32chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
EOF

# ── shared/errors/app.errors.ts ────────────────────────────────────────────
cat > apps/api/src/shared/errors/app.errors.ts << 'EOF'
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
export class BadRequestError extends AppError {
  constructor(message: string) { super(message, 400, 'BAD_REQUEST') }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') { super(message, 401, 'UNAUTHORIZED') }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') { super(message, 403, 'FORBIDDEN') }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} não encontrado(a)`, 404, 'NOT_FOUND') }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT') }
}
export class UnprocessableError extends AppError {
  constructor(message: string) { super(message, 422, 'UNPROCESSABLE') }
}
EOF

# ── shared/middlewares/error.handler.ts ────────────────────────────────────
cat > apps/api/src/shared/middlewares/error.handler.ts << 'EOF'
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../errors/app.errors'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    })
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      errors: error.flatten().fieldErrors,
    })
  }
  if ('statusCode' in error && error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      code: 'REQUEST_ERROR',
      message: error.message,
    })
  }
  req.log.error(error)
  return reply.status(500).send({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor',
  })
}
EOF

# ── shared/plugins/prisma.plugin.ts ───────────────────────────────────────
cat > apps/api/src/shared/plugins/prisma.plugin.ts << 'EOF'
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const prisma = new PrismaClient()
  await prisma.$connect()
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => { await prisma.$disconnect() })
  app.log.info('✅ Prisma conectado')
})

export { prismaPlugin }
EOF

# ── shared/plugins/jwt.plugin.ts ──────────────────────────────────────────
cat > apps/api/src/shared/plugins/jwt.plugin.ts << 'EOF'
import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { Role } from '@prisma/client'
import { UnauthorizedError, ForbiddenError } from '../errors/app.errors'

interface JwtPayload {
  sub: string
  role: Role
  sindicoId?: string
  motoristaId?: string
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (...roles: Role[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user: JwtPayload
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

const jwtPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'sindiride_jwt_secret_chave_super_segura_32chars',
    sign: { expiresIn: '15m' },
  })

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try { await req.jwtVerify() }
    catch { throw new UnauthorizedError('Token inválido ou expirado') }
  })

  app.decorate('authorize', (...roles: Role[]) => {
    return async (req: FastifyRequest) => {
      try { await req.jwtVerify() }
      catch { throw new UnauthorizedError('Token inválido ou expirado') }
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('Acesso não permitido para este perfil')
      }
    }
  })
})

export { jwtPlugin }
export type { JwtPayload }
EOF

# ── modules/auth/schemas/auth.schema.ts ───────────────────────────────────
mkdir -p apps/api/src/modules/auth/schemas apps/api/src/modules/auth/services
cat > apps/api/src/modules/auth/schemas/auth.schema.ts << 'EOF'
import { z } from 'zod'

export const loginSchema = z.object({
  cpf:      z.string().min(1, 'CPF obrigatório'),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  name:                z.string().min(3),
  email:               z.string().email(),
  cpf:                 z.string().min(11),
  phone:               z.string().min(10),
  password:            z.string().min(8),
  condominiumName:     z.string().min(3),
  condominiumAddress:  z.string().min(5),
  condominiumDistrict: z.string().min(2),
  condominiumZip:      z.string().min(8),
  mandateType:         z.enum(['ELEITO', 'PROFISSIONAL', 'SUBSINDICO', 'INTERINO']),
})

export const refreshSchema = z.object({
  refreshToken: z.string(),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type RefreshInput  = z.infer<typeof refreshSchema>
EOF

# ── modules/auth/services/auth.service.ts ─────────────────────────────────
cat > apps/api/src/modules/auth/services/auth.service.ts << 'EOF'
import { FastifyInstance } from 'fastify'
import { compare, hash } from 'bcryptjs'
import { Role, UserStatus } from '@prisma/client'
import { LoginInput, RegisterInput } from '../schemas/auth.schema'
import { UnauthorizedError, ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors/app.errors'

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async login(data: LoginInput) {
    const user = await this.app.prisma.user.findUnique({
      where: { cpf: data.cpf },
      include: { sindico: true, motorista: true },
    })
    if (!user) throw new UnauthorizedError('CPF ou senha incorretos')
    const match = await compare(data.password, user.password)
    if (!match) throw new UnauthorizedError('CPF ou senha incorretos')
    if (user.status === UserStatus.PENDENTE)  throw new ForbiddenError('Cadastro aguardando aprovação')
    if (user.status === UserStatus.BLOQUEADO) throw new ForbiddenError('Conta bloqueada')
    if (user.status === UserStatus.REJEITADO) throw new ForbiddenError('Cadastro não aprovado')

    const payload = { sub: user.id, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id }
    const accessToken  = this.app.jwt.sign(payload)
    const refreshToken = await this.generateRefreshToken(user.id)

    return {
      accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id },
    }
  }

  async register(data: RegisterInput) {
    const existing = await this.app.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { cpf: data.cpf }] },
    })
    if (existing?.email === data.email) throw new ConflictError('E-mail já cadastrado')
    if (existing?.cpf  === data.cpf)   throw new ConflictError('CPF já cadastrado')

    const passwordHash = await hash(data.password, 10)
    const user = await this.app.prisma.user.create({
      data: {
        name: data.name, email: data.email, cpf: data.cpf,
        phone: data.phone, password: passwordHash,
        role: Role.SINDICO, status: UserStatus.PENDENTE,
        sindico: {
          create: {
            condominiumName: data.condominiumName,
            condominiumAddress: data.condominiumAddress,
            condominiumDistrict: data.condominiumDistrict,
            condominiumZip: data.condominiumZip,
            mandateType: data.mandateType as any,
          },
        },
      },
    })
    return { message: 'Cadastro realizado. Aguarde a aprovação do administrador.', userId: user.id }
  }

  async refresh(refreshToken: string) {
    const record = await this.app.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { sindico: true, motorista: true } } },
    })
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token inválido ou expirado')
    }
    await this.app.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } })
    const { user } = record
    const payload = { sub: user.id, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id }
    const newAccessToken  = this.app.jwt.sign(payload)
    const newRefreshToken = await this.generateRefreshToken(user.id)
    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  }

  async logout(refreshToken: string) {
    await this.app.prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revokedAt: new Date() } })
    return { message: 'Sessão encerrada' }
  }

  async me(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true,
        sindico: { select: { id: true, condominiumName: true, condominiumAddress: true, condominiumDistrict: true, mandateType: true } },
        motorista: { select: { id: true, vehicleModel: true, vehicleBrand: true, vehicleColor: true, vehiclePlate: true, isAvailable: true, ratingAvg: true } },
      },
    })
    if (!user) throw new NotFoundError('Usuário')
    return user
  }

  private async generateRefreshToken(userId: string) {
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await this.app.prisma.refreshToken.create({ data: { userId, token, expiresAt } })
    return token
  }
}
EOF

# ── modules/auth/auth.routes.ts ───────────────────────────────────────────
cat > apps/api/src/modules/auth/auth.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'
import { AuthService } from './services/auth.service'
import { loginSchema, registerSchema, refreshSchema } from './schemas/auth.schema'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const svc = new AuthService(app)

  app.post('/login', async (req, reply) => {
    const data = loginSchema.parse(req.body)
    return reply.send(await svc.login(data))
  })

  app.post('/register', async (req, reply) => {
    const data = registerSchema.parse(req.body)
    return reply.status(201).send(await svc.register(data))
  })

  app.post('/refresh', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body)
    return reply.send(await svc.refresh(refreshToken))
  })

  app.post('/logout', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body)
    return reply.send(await svc.logout(refreshToken))
  })

  app.get('/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    return reply.send(await svc.me(req.user.sub))
  })
}
EOF

# ── modules/sindico/sindico.routes.ts ─────────────────────────────────────
mkdir -p apps/api/src/modules/sindico
cat > apps/api/src/modules/sindico/sindico.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'
import { NotFoundError } from '../../shared/errors/app.errors'

export const sindicoRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { onRequest: [app.authorize('SINDICO')] }, async (req, reply) => {
    const sindico = await app.prisma.sindico.findUnique({
      where: { userId: req.user.sub },
      include: { user: { select: { name: true, email: true, phone: true } } },
    })
    if (!sindico) throw new NotFoundError('Síndico')
    return reply.send(sindico)
  })
}
EOF

# ── modules/motorista/motorista.routes.ts ─────────────────────────────────
mkdir -p apps/api/src/modules/motorista
cat > apps/api/src/modules/motorista/motorista.routes.ts << 'EOF'
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
EOF

# ── modules/ride/ride.routes.ts ───────────────────────────────────────────
mkdir -p apps/api/src/modules/ride
cat > apps/api/src/modules/ride/ride.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, BadRequestError, UnprocessableError } from '../../shared/errors/app.errors'
import { RideStatus, CancelledBy } from '@prisma/client'

export const rideRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { onRequest: [app.authorize('SINDICO')] }, async (req, reply) => {
    const schema = z.object({
      originAddress: z.string(), originDistrict: z.string(), originLat: z.number(), originLng: z.number(),
      destAddress:   z.string(), destDistrict:   z.string(), destLat:   z.number(), destLng:   z.number(),
      scheduledAt: z.coerce.date(), isImmediate: z.boolean().default(false), notes: z.string().optional(),
    })
    const data = schema.parse(req.body)
    const { sindicoId } = req.user
    if (!sindicoId) throw new ForbiddenError('Perfil de síndico não encontrado')
    if (data.scheduledAt < new Date()) throw new BadRequestError('Não é possível agendar para datas passadas')
    const active = await app.prisma.ride.findFirst({
      where: { sindicoId, status: { in: [RideStatus.AGENDADA, RideStatus.ACEITA, RideStatus.EM_ANDAMENTO] } },
    })
    if (active) throw new UnprocessableError('Você já possui uma corrida ativa')
    const ride = await app.prisma.ride.create({
      data: { sindicoId, ...data, status: RideStatus.AGENDADA,
        statusHistory: { create: { status: RideStatus.AGENDADA, note: 'Criada pelo síndico' } } },
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
    const ride = await app.prisma.ride.findUnique({ where: { id } })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.AGENDADA) throw new UnprocessableError('Corrida não disponível para aceite')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { motoristaId, status: RideStatus.ACEITA, acceptedAt: new Date(),
        statusHistory: { create: { status: RideStatus.ACEITA, changedBy: motoristaId } } },
    })
    return reply.send(updated)
  })

  app.patch('/:id/start', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const ride = await app.prisma.ride.findUnique({ where: { id } })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.ACEITA) throw new UnprocessableError('Corrida precisa estar aceita')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.EM_ANDAMENTO, startedAt: new Date(),
        statusHistory: { create: { status: RideStatus.EM_ANDAMENTO, changedBy: req.user.sub } } },
    })
    return reply.send(updated)
  })

  app.patch('/:id/finish', { onRequest: [app.authorize('MOTORISTA')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const ride = await app.prisma.ride.findUnique({ where: { id } })
    if (!ride) throw new NotFoundError('Corrida')
    if (ride.status !== RideStatus.EM_ANDAMENTO) throw new UnprocessableError('Corrida não está em andamento')
    const updated = await app.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.CONCLUIDA, finishedAt: new Date(),
        statusHistory: { create: { status: RideStatus.CONCLUIDA, changedBy: req.user.sub } } },
    })
    return reply.send(updated)
  })

  app.patch('/:id/cancel', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body)
    const ride = await app.prisma.ride.findUnique({ where: { id } })
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
EOF

# ── modules/route/route.routes.ts ─────────────────────────────────────────
mkdir -p apps/api/src/modules/route
cat > apps/api/src/modules/route/route.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'

export const routeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (_req, reply) => {
    const routes = await app.prisma.route.findMany({
      where: { isActive: true },
      orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
    })
    return reply.send(routes)
  })
}
EOF

# ── modules/admin/admin.routes.ts ─────────────────────────────────────────
mkdir -p apps/api/src/modules/admin
cat > apps/api/src/modules/admin/admin.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NotFoundError, BadRequestError } from '../../shared/errors/app.errors'
import { UserStatus, RideStatus } from '@prisma/client'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminOnly = { onRequest: [app.authorize('ADMIN')] }

  app.get('/dashboard', adminOnly, async (_req, reply) => {
    const [totalSindicos, pendingSindicos, totalMotoristas, activeRides, scheduledRides, availableDrivers] = await Promise.all([
      app.prisma.user.count({ where: { role: 'SINDICO', status: 'ATIVO' } }),
      app.prisma.user.count({ where: { role: 'SINDICO', status: 'PENDENTE' } }),
      app.prisma.motorista.count({ where: { user: { status: 'ATIVO' } } }),
      app.prisma.ride.count({ where: { status: RideStatus.EM_ANDAMENTO } }),
      app.prisma.ride.count({ where: { status: RideStatus.AGENDADA } }),
      app.prisma.motorista.count({ where: { isAvailable: true } }),
    ])
    return reply.send({
      sindicos:   { total: totalSindicos, pending: pendingSindicos },
      motoristas: { total: totalMotoristas, available: availableDrivers },
      rides:      { active: activeRides, scheduled: scheduledRides },
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
EOF

# ── modules/notification/notification.routes.ts ───────────────────────────
mkdir -p apps/api/src/modules/notification
cat > apps/api/src/modules/notification/notification.routes.ts << 'EOF'
import { FastifyPluginAsync } from 'fastify'

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const notifications = await app.prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return reply.send(notifications)
  })

  app.patch('/:id/read', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await app.prisma.notification.updateMany({ where: { id, userId: req.user.sub }, data: { isRead: true, readAt: new Date() } })
    return reply.send({ message: 'Notificação marcada como lida' })
  })

  app.patch('/read-all', { onRequest: [app.authenticate] }, async (req, reply) => {
    await app.prisma.notification.updateMany({ where: { userId: req.user.sub, isRead: false }, data: { isRead: true, readAt: new Date() } })
    return reply.send({ message: 'Todas marcadas como lidas' })
  })
}
EOF

echo "✅ Todos os arquivos criados!"
