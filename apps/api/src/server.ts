import { buildApp } from './app'

const start = async () => {
  const app = await buildApp()
  // Porta fixa: pra serviços via Dockerfile, o Railway não sincroniza o
  // roteamento do proxy com uma PORT dinâmica de forma confiável (mesmo
  // problema encontrado e corrigido no serviço Web) — por isso não lê
  // process.env.PORT. A config de rede do serviço no painel precisa
  // apontar pra esse mesmo número (8080), igual o EXPOSE do Dockerfile.
  const port = 8080
  try {
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 SindiRide API rodando em http://0.0.0.0:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
