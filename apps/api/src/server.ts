import { buildApp } from './app'

const start = async () => {
  const app = await buildApp()
  // Railway (e outros PaaS) injetam PORT dinamicamente — precisa escutar
  // nela, não numa porta fixa, senão o healthcheck nunca alcança o container.
  const port = Number(process.env.PORT) || 3333
  try {
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 SindiRide API rodando em http://0.0.0.0:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
