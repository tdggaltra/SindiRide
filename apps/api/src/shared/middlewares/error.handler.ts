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
