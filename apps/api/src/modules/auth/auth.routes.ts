import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { AuthService } from './services/auth.service'
import { loginSchema, registerSchema, refreshSchema } from './schemas/auth.schema'
import { BadRequestError } from '../../shared/errors/app.errors'
import { rateLimitErrorResponseBuilder } from '../../shared/utils/rate-limit'
import { uploadAvatar, deleteAvatarByUrl } from '../../shared/utils/storage'

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Em teste, os testes de integração fazem dezenas de logins no mesmo "IP"
// (127.0.0.1 do app.inject) só pra montar cenários de negócio — um limite de
// produção quebraria esses testes sem relação nenhuma com força bruta.
// Usa VITEST (setado pelo próprio test runner) em vez de NODE_ENV porque o
// container da API roda com NODE_ENV=development mesmo durante os testes
// (docker-compose.yml define isso pro modo dev normal).
const isTest = process.env.VITEST === 'true'
const LOGIN_RATE_LIMIT = {
  max: isTest ? 1000 : 5,
  timeWindow: '1 minute',
  errorResponseBuilder: rateLimitErrorResponseBuilder,
}
const REGISTER_RATE_LIMIT = {
  max: isTest ? 1000 : 3,
  timeWindow: '1 hour',
  errorResponseBuilder: rateLimitErrorResponseBuilder,
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const svc = new AuthService(app)

  // Limite apertado contra força bruta de senha (por IP)
  app.post('/login', { config: { rateLimit: LOGIN_RATE_LIMIT } }, async (req, reply) => {
    const data = loginSchema.parse(req.body)
    return reply.send(await svc.login(data))
  })

  // Limite apertado contra cadastros em massa/spam (por IP)
  app.post('/register', { config: { rateLimit: REGISTER_RATE_LIMIT } }, async (req, reply) => {
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

  // Upload de foto de perfil — síndico e motorista usam o mesmo endpoint
  app.patch('/avatar', { onRequest: [app.authenticate] }, async (req, reply) => {
    const file = await req.file()
    if (!file) throw new BadRequestError('Envie um arquivo de imagem')
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestError('Formato inválido — envie uma imagem JPEG, PNG ou WebP')
    }

    const buffer = await file.toBuffer()
    const user = await app.prisma.user.findUnique({ where: { id: req.user.sub }, select: { avatarUrl: true } })

    const avatarUrl = await uploadAvatar(buffer, req.user.sub)
    await app.prisma.user.update({ where: { id: req.user.sub }, data: { avatarUrl } })

    if (user?.avatarUrl) await deleteAvatarByUrl(user.avatarUrl)

    return reply.send({ avatarUrl })
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
