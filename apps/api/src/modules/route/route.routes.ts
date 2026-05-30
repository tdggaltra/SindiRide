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
