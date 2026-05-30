export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
export class BadRequestError extends AppError {
  constructor(message: string) { super(message, 400, 'BAD_REQUEST') }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') { super(message, 401, 'UNAUTHORIZED') }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') { super(message, 403, 'FORBIDDEN') }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} não encontrado(a)`, 404, 'NOT_FOUND') }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT') }
}
export class UnprocessableError extends AppError {
  constructor(message: string) { super(message, 422, 'UNPROCESSABLE') }
}
