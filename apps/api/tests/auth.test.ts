import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { UserStatus } from '@prisma/client'
import { buildApp } from '../src/app'
import { resetDb } from './helpers/db'
import { createSindico } from './helpers/factories'

describe('Auth', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb(app.prisma)
  })

  it('login com credenciais válidas retorna access e refresh token', async () => {
    const { user, password } = await createSindico(app.prisma)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.user.id).toBe(user.id)
  })

  it('login com senha errada retorna 401', async () => {
    const { user } = await createSindico(app.prisma)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password: 'senha-errada' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('login de usuário PENDENTE retorna 403', async () => {
    const { user, password } = await createSindico(app.prisma, { status: UserStatus.PENDENTE })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password },
    })

    expect(res.statusCode).toBe(403)
  })

  it('login de usuário BLOQUEADO retorna 403', async () => {
    const { user, password } = await createSindico(app.prisma, { status: UserStatus.BLOQUEADO })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password },
    })

    expect(res.statusCode).toBe(403)
  })

  it('register cria síndico com status PENDENTE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Novo Síndico',
        email: 'novo-sindico@teste.com',
        cpf: '12345678901',
        phone: '43999990000',
        password: 'senha12345',
        condominiumName: 'Condomínio Novo',
        condominiumAddress: 'Rua Nova, 1',
        condominiumDistrict: 'Centro',
        condominiumZip: '86000000',
        mandateType: 'ELEITO',
      },
    })

    expect(res.statusCode).toBe(201)
    const created = await app.prisma.user.findUnique({ where: { email: 'novo-sindico@teste.com' } })
    expect(created?.status).toBe('PENDENTE')
  })

  it('register com cpf já cadastrado retorna 409', async () => {
    const { user } = await createSindico(app.prisma)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Duplicado',
        email: 'duplicado@teste.com',
        cpf: user.cpf,
        phone: '43999990000',
        password: 'senha12345',
        condominiumName: 'Condomínio',
        condominiumAddress: 'Rua, 1',
        condominiumDistrict: 'Centro',
        condominiumZip: '86000000',
        mandateType: 'ELEITO',
      },
    })

    expect(res.statusCode).toBe(409)
  })

  it('refresh gira o token e invalida o anterior', async () => {
    const { user, password } = await createSindico(app.prisma)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password },
    })
    const { refreshToken } = login.json()

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    })
    expect(refreshed.statusCode).toBe(200)
    expect(refreshed.json().refreshToken).not.toBe(refreshToken)

    const reused = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    })
    expect(reused.statusCode).toBe(401)
  })

  it('GET /me sem token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /me com token válido retorna o usuário autenticado', async () => {
    const { user, password } = await createSindico(app.prisma)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { cpf: user.cpf, password },
    })
    const { accessToken } = login.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(user.id)
  })
})
