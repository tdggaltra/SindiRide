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
