import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { prismaPlugin } from './shared/plugins/prisma.plugin'
import { jwtPlugin } from './shared/plugins/jwt.plugin'
import { socketPlugin } from './shared/plugins/socket.plugin'
import { errorHandler } from './shared/middlewares/error.handler'
import { authRoutes } from './modules/auth/auth.routes'
import { sindicoRoutes } from './modules/sindico/sindico.routes'
import { motoristaRoutes } from './modules/motorista/motorista.routes'
import { rideRoutes } from './modules/ride/ride.routes'
import { routeRoutes } from './modules/route/route.routes'
import { adminRoutes } from './modules/admin/admin.routes'
import { notificationRoutes } from './modules/notification/notification.routes'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })
await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: true, credentials: true })

  await app.register(prismaPlugin)
  await app.register(jwtPlugin)
  await app.register(socketPlugin)

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))
await app.register(authRoutes,         { prefix: '/api/auth' })
  await app.register(sindicoRoutes,      { prefix: '/api/sindicos' })
  await app.register(motoristaRoutes,    { prefix: '/api/motoristas' })
  await app.register(rideRoutes,         { prefix: '/api/rides' })
  await app.register(routeRoutes,        { prefix: '/api/routes' })
  await app.register(adminRoutes,        { prefix: '/api/admin' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })

  return app
}
