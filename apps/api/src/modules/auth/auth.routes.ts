import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { AuthService } from './services/auth.service'
import { loginSchema, registerSchema, refreshSchema } from './schemas/auth.schema'
import { BadRequestError } from '../../shared/errors/app.errors'

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

  // Solicita redefinição de senha — gera token e retorna link (em produção, envia por e-mail)
  app.post('/forgot-password', async (req, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)

    const user = await app.prisma.user.findUnique({ where: { email } })

    // Resposta genérica para não revelar se o e-mail existe
    const genericMsg = { message: 'Se o e-mail estiver cadastrado, você receberá as instruções de redefinição.' }

    if (!user) return reply.send(genericMsg)

    // Invalida tokens anteriores não usados
    await app.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await app.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } })

    const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/redefinir-senha/${token}`

    // Em produção: enviar resetLink por e-mail. Em desenvolvimento: retorna no corpo.
    if (process.env.NODE_ENV === 'development') {
      return reply.send({ ...genericMsg, resetLink })
    }
    return reply.send(genericMsg)
  })

  // Salva token FCM para push notifications
  app.patch('/fcm-token', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { fcmToken } = z.object({ fcmToken: z.string().min(1) }).parse(req.body)
    await app.prisma.user.update({ where: { id: req.user.sub }, data: { fcmToken } })
    return reply.send({ ok: true })
  })

  // Redefine a senha com o token recebido
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = z.object({
      token:    z.string().min(1),
      password: z.string().min(8, 'Mínimo 8 caracteres'),
    }).parse(req.body)

    const record = await app.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestError('Link de redefinição inválido ou expirado.')
    }

    const passwordHash = await hash(password, 10)

    await Promise.all([
      app.prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash } }),
      app.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Revoga todos os refresh tokens para forçar novo login
      app.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ])

    return reply.send({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' })
  })
}
