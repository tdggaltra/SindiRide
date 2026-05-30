import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { Server as SocketIOServer } from 'socket.io'

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
  }
}

const socketPlugin: FastifyPluginAsync = fp(async (app) => {
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())

  const io = new SocketIOServer(app.server, {
    cors: { origin: origins, credentials: true },
    transports: ['websocket', 'polling'],
  })

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined
      if (!token) throw new Error('Token ausente')
      const payload = app.jwt.verify<{
        sub: string
        role: string
        sindicoId?: string
        motoristaId?: string
      }>(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Token inválido ou expirado'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as {
      sub: string
      role: string
      sindicoId?: string
      motoristaId?: string
    }

    // Personal room — used to push targeted notifications
    socket.join(`user:${user.sub}`)

    // Síndico joins a ride room to track live updates
    socket.on('ride:join', ({ rideId }: { rideId: string }) => {
      socket.join(`ride:${rideId}`)
    })

    socket.on('ride:leave', ({ rideId }: { rideId: string }) => {
      socket.leave(`ride:${rideId}`)
    })

    // Motorista sends GPS position every 5s during EM_ANDAMENTO
    socket.on(
      'location:update',
      async ({ rideId, lat, lng }: { rideId: string; lat: number; lng: number }) => {
        if (user.role !== 'MOTORISTA') return
        io.to(`ride:${rideId}`).emit('driver:location', { rideId, lat, lng })
        try {
          await app.prisma.motorista.update({
            where: { userId: user.sub },
            data: { lastLocationLat: lat, lastLocationLng: lng, lastSeenAt: new Date() },
          })
        } catch { /* silently swallow — location update is best-effort */ }
      },
    )
  })

  app.decorate('io', io)
  app.log.info('✅ Socket.io configurado')
})

export { socketPlugin }
