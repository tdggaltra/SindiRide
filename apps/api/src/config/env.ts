import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:    z.enum(['development', 'test', 'production']).default('development'),
  PORT:        z.coerce.number().default(3333),
  DATABASE_URL: z.string(),
  REDIS_URL:    z.string().optional(),
  JWT_SECRET:          z.string().default('sindiride_jwt_secret_chave_super_segura_32chars'),
  JWT_EXPIRES_IN:      z.string().default('15m'),
  JWT_REFRESH_SECRET:  z.string().default('sindiride_refresh_secret_chave_super_segura_32chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
