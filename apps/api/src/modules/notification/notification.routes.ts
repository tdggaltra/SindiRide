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
