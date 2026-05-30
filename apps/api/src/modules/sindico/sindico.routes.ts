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
