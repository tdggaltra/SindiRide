import { buildApp } from './app'

const start = async () => {
  const app = await buildApp()
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' })
    console.log('🚀 SindiRide API rodando em http://0.0.0.0:3333')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
