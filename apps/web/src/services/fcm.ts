import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'
import { api } from './api.client'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
}

let _app: FirebaseApp | null = null
let _msg: Messaging | null   = null

function isConfigured() {
  return !!import.meta.env.VITE_FIREBASE_PROJECT_ID
}

function getFirebaseApp() {
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  return _app
}

function getFirebaseMsg() {
  if (!_msg) _msg = getMessaging(getFirebaseApp())
  return _msg
}

/**
 * Solicita permissão de notificação, registra o service worker, obtém o token FCM
 * e o salva no backend. Retorna o token ou null se não configurado/negado.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (!isConfigured()) return null
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Registra o service worker e repassa a config via postMessage
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const sendConfig = () =>
      navigator.serviceWorker.controller?.postMessage({
        type: '__FIREBASE_CONFIG__',
        config: firebaseConfig,
      })

    swReg.active ? sendConfig() : navigator.serviceWorker.addEventListener('controllerchange', sendConfig)

    const token = await getToken(getFirebaseMsg(), {
      vapidKey:                  import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })

    if (token) {
      await api.patch('/api/auth/fcm-token', { fcmToken: token }).catch(() => {})
    }

    return token || null
  } catch (err) {
    console.warn('[FCM] Registro de token falhou:', err)
    return null
  }
}

/**
 * Exibe notificações push quando o app está em primeiro plano.
 * Retorna uma função de cleanup para cancelar o listener.
 */
export function setupForegroundMessages(): () => void {
  if (!isConfigured()) return () => {}
  try {
    return onMessage(getFirebaseMsg(), payload => {
      const title = payload.notification?.title ?? 'SindiRide'
      const body  = payload.notification?.body  ?? ''
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/vite.svg' })
      }
    })
  } catch {
    return () => {}
  }
}
