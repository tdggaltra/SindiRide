import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'

let globalSocket: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3333', {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })
    }

    socketRef.current = globalSocket

    return () => {
      // Não desconecta ao desmontar — mantém conexão viva globalmente
    }
  }, [token])

  return socketRef.current
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
) {
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [socket, event, handler])
}

export function disconnectSocket() {
  globalSocket?.disconnect()
  globalSocket = null
}
