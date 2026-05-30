import { z } from 'zod'

export const loginSchema = z.object({
  cpf:      z.string().min(1, 'CPF obrigatório'),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  name:                z.string().min(3),
  email:               z.string().email(),
  cpf:                 z.string().min(11),
  phone:               z.string().min(10),
  password:            z.string().min(8),
  condominiumName:     z.string().min(3),
  condominiumAddress:  z.string().min(5),
  condominiumDistrict: z.string().min(2),
  condominiumZip:      z.string().min(8),
  mandateType:         z.enum(['ELEITO', 'PROFISSIONAL', 'SUBSINDICO', 'INTERINO']),
})

export const refreshSchema = z.object({
  refreshToken: z.string(),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type RefreshInput  = z.infer<typeof refreshSchema>
