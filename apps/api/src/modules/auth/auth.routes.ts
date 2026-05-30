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
