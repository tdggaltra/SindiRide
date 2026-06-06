// Service Worker para Firebase Cloud Messaging — push em background
// A configuração é injetada pelo app via postMessage (não precisa editar aqui)

self.addEventListener('message', ({ data }) => {
  if (data?.type !== '__FIREBASE_CONFIG__') return
  if (self.__fcmReady) return   // já inicializado

  try {
    importScripts(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
    )

    if (!self.firebase.apps.length) {
      self.firebase.initializeApp(data.config)
    }

    self.firebase.messaging().onBackgroundMessage(payload => {
      const title = payload.notification?.title ?? 'SindiRide'
      const body  = payload.notification?.body  ?? ''
      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
        data: payload.data ?? {},
      })
    })

    self.__fcmReady = true
  } catch (err) {
    console.error('[FCM SW] Falha ao inicializar:', err)
  }
})
