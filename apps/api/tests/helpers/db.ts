import { PrismaClient } from '@prisma/client'

/**
 * Ordem importa: Ride precisa ser removido antes de Sindico/Motorista (FK
 * obrigatória sem onDelete, o Postgres bloqueia o cascade vindo de User),
 * e AuditLog precisa ser removido antes de User pelo mesmo motivo.
 * O resto (Sindico, Motorista, Admin, RefreshToken, PasswordResetToken,
 * Notification, RideStatusHistory) cai em cascata a partir daqui.
 */
export async function resetDb(prisma: PrismaClient) {
  await prisma.ride.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.route.deleteMany()
}
