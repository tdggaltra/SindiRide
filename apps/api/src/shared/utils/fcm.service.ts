import * as admin from 'firebase-admin'

let initialized = false

function getApp(): admin.app.App | null {
  if (initialized) return admin.app()

  const projectId    = process.env.FIREBASE_PROJECT_ID
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    // Credenciais não configuradas — FCM desabilitado silenciosamente
    return null
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
  initialized = true
  return admin.app()
}

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Envia push notification para um token FCM específico.
 * Retorna true em sucesso, false se FCM não está configurado ou o token é inválido.
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload,
): Promise<boolean> {
  const app = getApp()
  if (!app) return false

  try {
    await admin.messaging(app).send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
    return true
  } catch (err: any) {
    // Token inválido ou expirado — não propaga o erro
    if (err?.code === 'messaging/registration-token-not-registered') return false
    console.error('[FCM] Erro ao enviar notificação:', err?.message ?? err)
    return false
  }
}

/**
 * Envia push para todos os tokens FCM de um usuário.
 * Usado pelo módulo de notificações.
 */
export async function sendPushToUser(
  fcmTokens: string[],
  payload: PushPayload,
): Promise<void> {
  if (!fcmTokens.length) return
  await Promise.allSettled(fcmTokens.map(token => sendPushNotification(token, payload)))
}
