import { buildApp } from './app'

const start = async () => {
  const app = await buildApp()
  // Porta fixa: pra serviços via Dockerfile, o Railway não mantém o
  // roteamento do proxy sincronizado com um PORT dinâmico de forma
  // confiável (mesmo problema encontrado no serviço Web) — a config de
  // rede do serviço no painel precisa apontar pra esse mesmo número.
  const port = Number(process.env.PORT) || 8080
  try {
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 SindiRide API rodando em http://0.0.0.0:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
