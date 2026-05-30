import { PrismaClient, Role, UserStatus, MandateType, RideStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sindiride.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@sindiride.com.br',
      cpf: '000.000.000-00',
      phone: '(43) 3000-0000',
      password: await hash('admin@123', 10),
      role: Role.ADMIN,
      status: UserStatus.ATIVO,
      admin: { create: {} },
    },
  })
  console.log('✅ Admin criado:', adminUser.email)

  const motorista1 = await prisma.user.upsert({
    where: { email: 'joao.ferreira@sindiride.com.br' },
    update: {},
    create: {
      name: 'João Ferreira',
      email: 'joao.ferreira@sindiride.com.br',
      cpf: '111.111.111-11',
      phone: '(43) 9 9111-1111',
      password: await hash('motorista@123', 10),
      role: Role.MOTORISTA,
      status: UserStatus.ATIVO,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      motorista: {
        create: {
          vehicleBrand: 'Hyundai',
          vehicleModel: 'HB20',
          vehicleColor: 'Branco',
          vehiclePlate: 'ABC-1234',
          vehicleYear: 2022,
          cnhNumber: 'CNH111111',
          cnhCategory: 'B',
          cnhExpiry: new Date('2028-06-01'),
          isAvailable: true,
          ratingAvg: 4.8,
          ratingCount: 42,
        },
      },
    },
  })
  console.log('✅ Motorista criado:', motorista1.name)

  const sindico1 = await prisma.user.upsert({
    where: { email: 'carlos.oliveira@email.com' },
    update: {},
    create: {
      name: 'Carlos Oliveira',
      email: 'carlos.oliveira@email.com',
      cpf: '987.654.321-00',
      phone: '(43) 9 9987-6543',
      password: await hash('sindico@123', 10),
      role: Role.SINDICO,
      status: UserStatus.ATIVO,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      sindico: {
        create: {
          condominiumName: 'Ed. Solar das Flores',
          condominiumAddress: 'Rua das Palmeiras, 320',
          condominiumDistrict: 'Jardim Higienópolis',
          condominiumZip: '86020-000',
          mandateType: MandateType.ELEITO,
          mandateStartDate: new Date('2024-01-01'),
          mandateEndDate: new Date('2026-12-31'),
        },
      },
    },
  })
  console.log('✅ Síndico criado:', sindico1.name)

  const sindicoPendente = await prisma.user.upsert({
    where: { email: 'roberto.mendes@email.com' },
    update: {},
    create: {
      name: 'Roberto Mendes',
      email: 'roberto.mendes@email.com',
      cpf: '456.789.123-00',
      phone: '(43) 9 9456-7891',
      password: await hash('sindico@123', 10),
      role: Role.SINDICO,
      status: UserStatus.PENDENTE,
      sindico: {
        create: {
          condominiumName: 'Ed. Vila Nova',
          condominiumAddress: 'Rua Pernambuco, 800',
          condominiumDistrict: 'Centro',
          condominiumZip: '86010-000',
          mandateType: MandateType.PROFISSIONAL,
        },
      },
    },
  })
  console.log('✅ Síndico pendente criado:', sindicoPendente.name)

  const rotasData = [
    { name: 'Prefeitura de Londrina',       category: 'Órgão público', address: 'Av. Duque de Caxias, 635',  district: 'Centro',        lat: -23.3105, lng: -51.1628, isPopular: true  },
    { name: 'Fórum Cível de Londrina',      category: 'Judiciário',    address: 'R. Benjamin Constant, 400', district: 'Centro',        lat: -23.3060, lng: -51.1620, isPopular: true  },
    { name: 'Cartório 3º Ofício de Notas',  category: 'Cartório',      address: 'R. Mato Grosso, 214',       district: 'Centro',        lat: -23.3085, lng: -51.1650, isPopular: true  },
    { name: 'Receita Federal — Londrina',   category: 'Órgão federal', address: 'Av. Higienópolis, 153',     district: 'Higienópolis',  lat: -23.3120, lng: -51.1590, isPopular: false },
    { name: 'Banco do Brasil — Ag. Centro', category: 'Banco',         address: 'R. Sergipe, 300',           district: 'Centro',        lat: -23.3095, lng: -51.1635, isPopular: true  },
    { name: 'PROCON Londrina',              category: 'Órgão público', address: 'R. Pernambuco, 235',        district: 'Centro',        lat: -23.3070, lng: -51.1610, isPopular: false },
    { name: 'Detran Londrina',              category: 'Órgão público', address: 'Av. Saul Elkind, 2000',     district: 'Três Bocas',    lat: -23.2880, lng: -51.1750, isPopular: false },
  ]

  for (const rota of rotasData) {
    await prisma.route.upsert({
      where: { id: rota.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
      update: {},
      create: {
        id: rota.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        ...rota,
      },
    })
  }
  console.log(`✅ ${rotasData.length} rotas criadas`)

  console.log('\n🎉 Seed concluído!')
  console.log('\n📋 Credenciais:')
  console.log('  Admin:     admin@sindiride.com.br    / admin@123')
  console.log('  Síndico:   carlos.oliveira@email.com / sindico@123')
  console.log('  Motorista: joao.ferreira@sindiride.com.br / motorista@123')
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
