import { hash } from 'bcryptjs'
import { PrismaClient, Role, UserStatus, MandateType } from '@prisma/client'

let seq = 0
function nextId() {
  seq += 1
  return seq
}

const DEFAULT_PASSWORD = 'senha12345'

export async function createSindico(
  prisma: PrismaClient,
  overrides: { status?: UserStatus; password?: string } = {},
) {
  const n = nextId()
  const password = overrides.password ?? DEFAULT_PASSWORD
  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: `Síndico Teste ${n}`,
      email: `sindico${n}@teste.com`,
      cpf: String(n).padStart(11, '1'),
      phone: '43999990000',
      password: passwordHash,
      role: Role.SINDICO,
      status: overrides.status ?? UserStatus.ATIVO,
      sindico: {
        create: {
          condominiumName: `Condomínio Teste ${n}`,
          condominiumAddress: 'Rua Teste, 100',
          condominiumDistrict: 'Centro',
          condominiumZip: '86000000',
          mandateType: MandateType.ELEITO,
        },
      },
    },
    include: { sindico: true },
  })

  return { user, sindico: user.sindico!, password }
}

export async function createMotorista(
  prisma: PrismaClient,
  overrides: { status?: UserStatus; password?: string } = {},
) {
  const n = nextId()
  const password = overrides.password ?? DEFAULT_PASSWORD
  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: `Motorista Teste ${n}`,
      email: `motorista${n}@teste.com`,
      cpf: String(n).padStart(11, '2'),
      phone: '43988880000',
      password: passwordHash,
      role: Role.MOTORISTA,
      status: overrides.status ?? UserStatus.ATIVO,
      motorista: {
        create: {
          vehicleBrand: 'Fiat',
          vehicleModel: 'Uno',
          vehicleColor: 'Branco',
          vehiclePlate: `TST${n}${n}${n}`.slice(0, 7).padEnd(7, '0'),
          vehicleYear: 2020,
          cnhNumber: `CNH-TEST-${n}`,
          cnhCategory: 'B',
          cnhExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isAvailable: true,
        },
      },
    },
    include: { motorista: true },
  })

  return { user, motorista: user.motorista!, password }
}
