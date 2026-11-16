import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { FastifyInstance } from 'fastify'
import { resetDb } from './helpers/db'
import { createSindico } from './helpers/factories'

// Sem credenciais de R2 nos testes/CI — mocka o módulo inteiro, assim o
// endpoint é testado (auth, validação de arquivo, atualização do banco,
// limpeza do avatar antigo) sem precisar de rede nem de bucket de verdade.
vi.mock('../src/shared/utils/storage', () => ({
  uploadAvatar: vi.fn(),
  deleteAvatarByUrl: vi.fn(),
}))

import { buildApp } from '../src/app'
import { uploadAvatar, deleteAvatarByUrl } from '../src/shared/utils/storage'

async function loginAs(app: FastifyInstance, cpf: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { cpf, password } })
  return res.json().accessToken as string
}

function buildMultipartPayload(fieldName: string, filename: string, mimetype: string, content: Buffer) {
  const boundary = '----avatarTestBoundary'
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` }
}

describe('PATCH /api/auth/avatar', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDb(app.prisma)
    vi.mocked(uploadAvatar).mockReset()
    vi.mocked(deleteAvatarByUrl).mockReset()
  })

  it('exige autenticação', async () => {
    const { payload, contentType } = buildMultipartPayload('avatar', 'foto.jpg', 'image/jpeg', Buffer.from('fake'))
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/avatar',
      headers: { 'content-type': contentType }, payload,
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejeita arquivo com mimetype inválido', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)

    const { payload, contentType } = buildMultipartPayload('avatar', 'arquivo.pdf', 'application/pdf', Buffer.from('fake'))
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType }, payload,
    })
    expect(res.statusCode).toBe(400)
    expect(uploadAvatar).not.toHaveBeenCalled()
  })

  it('faz upload, salva a URL e apaga o avatar antigo', async () => {
    const { user, password } = await createSindico(app.prisma)
    await app.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: 'https://cdn.example.com/avatars/old.jpg' } })
    const token = await loginAs(app, user.cpf, password)

    vi.mocked(uploadAvatar).mockResolvedValue('https://cdn.example.com/avatars/new.jpg')

    const { payload, contentType } = buildMultipartPayload('avatar', 'foto.jpg', 'image/jpeg', Buffer.from('fake-image-bytes'))
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType }, payload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().avatarUrl).toBe('https://cdn.example.com/avatars/new.jpg')
    expect(uploadAvatar).toHaveBeenCalledWith(expect.any(Buffer), user.id)
    expect(deleteAvatarByUrl).toHaveBeenCalledWith('https://cdn.example.com/avatars/old.jpg')

    const updated = await app.prisma.user.findUnique({ where: { id: user.id } })
    expect(updated?.avatarUrl).toBe('https://cdn.example.com/avatars/new.jpg')
  })

  it('não tenta apagar avatar antigo quando não havia um', async () => {
    const { user, password } = await createSindico(app.prisma)
    const token = await loginAs(app, user.cpf, password)
    vi.mocked(uploadAvatar).mockResolvedValue('https://cdn.example.com/avatars/first.jpg')

    const { payload, contentType } = buildMultipartPayload('avatar', 'foto.jpg', 'image/jpeg', Buffer.from('fake-image-bytes'))
    const res = await app.inject({
      method: 'PATCH', url: '/api/auth/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType }, payload,
    })

    expect(res.statusCode).toBe(200)
    expect(deleteAvatarByUrl).not.toHaveBeenCalled()
  })
})
