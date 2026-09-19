import { RateLimitPluginOptions } from '@fastify/rate-limit'
import { AppError } from '../errors/app.errors'

// @fastify/rate-limit faz `throw errorResponseBuilder(...)` (não responde
// direto) — o errorHandler global só preserva um `code` customizado quando o
// erro é instanceof AppError; qualquer outro objeto cai no fallback genérico
// e vira "REQUEST_ERROR". Por isso retorna um AppError de verdade aqui, e não
// um objeto literal. Reaproveitada tanto no registro global (app.ts) quanto
// nas rotas com limite próprio (auth.routes.ts).
export const rateLimitErrorResponseBuilder: RateLimitPluginOptions['errorResponseBuilder'] = (_req, context) =>
  new AppError(`Muitas requisições. Tente novamente em ${context.after}.`, 429, 'TOO_MANY_REQUESTS')
