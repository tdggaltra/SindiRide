import { PrismaClient, NotificationType } from '@prisma/client'
import { Server as SocketIO } from 'socket.io'
import { sendPushToUser } from './fcm.service'

interface NotifyOptions {
  userId: string
  type: NotificationType
  title: string
  body: string
  rideId?: string
}

/**
 * Cria notificação no banco, emite via Socket.io e dispara FCM push se configurado.
 * Nunca lança exceção — erros de push são silenciosos para não bloquear o fluxo principal.
 */
export async function notify(
  prisma: PrismaClient,
  io: SocketIO | null,
  opts: NotifyOptions,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      rideId: opts.rideId ?? null,
    },
  })

  // Real-time via Socket.io
  io?.to(`user:${opts.userId}`).emit('notification', {
    type:  opts.type,
    title: opts.title,
    body:  opts.body,
    rideId: opts.rideId,
  })

  // Push FCM (best-effort — falha silenciosa)
  prisma.user
    .findUnique({ where: { id: opts.userId }, select: { fcmToken: true } })
    .then(user => {
      if (user?.fcmToken) {
        sendPushToUser([user.fcmToken], { title: opts.title, body: opts.body })
      }
    })
    .catch(() => {})
}
