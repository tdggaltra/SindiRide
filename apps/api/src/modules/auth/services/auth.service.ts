import { FastifyInstance } from 'fastify'
import { compare, hash } from 'bcryptjs'
import { Role, UserStatus } from '@prisma/client'
import { LoginInput, RegisterInput } from '../schemas/auth.schema'
import { UnauthorizedError, ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors/app.errors'

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async login(data: LoginInput) {
    const user = await this.app.prisma.user.findUnique({
      where: { cpf: data.cpf },
      include: { sindico: true, motorista: true },
    })
    if (!user) throw new UnauthorizedError('CPF ou senha incorretos')
    const match = await compare(data.password, user.password)
    if (!match) throw new UnauthorizedError('CPF ou senha incorretos')
    if (user.status === UserStatus.PENDENTE)  throw new ForbiddenError('Cadastro aguardando aprovação')
    if (user.status === UserStatus.BLOQUEADO) throw new ForbiddenError('Conta bloqueada')
    if (user.status === UserStatus.REJEITADO) throw new ForbiddenError('Cadastro não aprovado')

    const payload = { sub: user.id, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id }
    const accessToken  = this.app.jwt.sign(payload)
    const refreshToken = await this.generateRefreshToken(user.id)

    return {
      accessToken, refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id },
    }
  }

  async register(data: RegisterInput) {
    const existing = await this.app.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { cpf: data.cpf }] },
    })
    if (existing?.email === data.email) throw new ConflictError('E-mail já cadastrado')
    if (existing?.cpf  === data.cpf)   throw new ConflictError('CPF já cadastrado')

    const passwordHash = await hash(data.password, 10)
    const user = await this.app.prisma.user.create({
      data: {
        name: data.name, email: data.email, cpf: data.cpf,
        phone: data.phone, password: passwordHash,
        role: Role.SINDICO, status: UserStatus.PENDENTE,
        sindico: {
          create: {
            condominiumName: data.condominiumName,
            condominiumAddress: data.condominiumAddress,
            condominiumDistrict: data.condominiumDistrict,
            condominiumZip: data.condominiumZip,
            mandateType: data.mandateType as any,
          },
        },
      },
    })
    return { message: 'Cadastro realizado. Aguarde a aprovação do administrador.', userId: user.id }
  }

  async refresh(refreshToken: string) {
    const record = await this.app.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { sindico: true, motorista: true } } },
    })
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token inválido ou expirado')
    }
    await this.app.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } })
    const { user } = record
    const payload = { sub: user.id, role: user.role, sindicoId: user.sindico?.id, motoristaId: user.motorista?.id }
    const newAccessToken  = this.app.jwt.sign(payload)
    const newRefreshToken = await this.generateRefreshToken(user.id)
    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  }

  async logout(refreshToken: string) {
    await this.app.prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revokedAt: new Date() } })
    return { message: 'Sessão encerrada' }
  }

  async me(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true,
        sindico: { select: { id: true, condominiumName: true, condominiumAddress: true, condominiumDistrict: true, mandateType: true } },
        motorista: { select: { id: true, vehicleModel: true, vehicleBrand: true, vehicleColor: true, vehiclePlate: true, isAvailable: true, ratingAvg: true } },
      },
    })
    if (!user) throw new NotFoundError('Usuário')
    return user
  }

  private async generateRefreshToken(userId: string) {
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await this.app.prisma.refreshToken.create({ data: { userId, token, expiresAt } })
    return token
  }
}
