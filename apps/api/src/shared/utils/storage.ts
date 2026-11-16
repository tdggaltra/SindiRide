import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { AppError } from '../errors/app.errors'

let _client: S3Client | null = null

// Cliente preguiçoso — só é construído no primeiro upload/delete, nunca no
// import do módulo. É o que permite os testes (e a CI, sem credenciais de
// R2) importarem este arquivo sem quebrar (mesmo padrão de fcm.service.ts).
function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new AppError('Upload de foto não está configurado no servidor', 503, 'STORAGE_NOT_CONFIGURED')
  }

  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return _client
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new AppError('Upload de foto não está configurado no servidor', 503, 'STORAGE_NOT_CONFIGURED')
  return bucket
}

function getPublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL
  if (!url) throw new AppError('Upload de foto não está configurado no servidor', 503, 'STORAGE_NOT_CONFIGURED')
  return url.replace(/\/$/, '')
}

/**
 * Redimensiona a imagem (máx. 512x512, convertida pra JPEG) e sobe pro R2.
 * Retorna a URL pública final salva em User.avatarUrl.
 */
export async function uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
  const client = getClient()
  const bucket = getBucketName()

  const resized = await sharp(buffer)
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer()

  const key = `avatars/${userId}-${Date.now()}.jpg`

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: resized,
    ContentType: 'image/jpeg',
  }))

  return `${getPublicUrl()}/${key}`
}

/** Remove um avatar antigo do bucket a partir da URL salva no banco. */
export async function deleteAvatarByUrl(url: string): Promise<void> {
  try {
    const publicUrl = getPublicUrl()
    if (!url.startsWith(`${publicUrl}/`)) return
    const key = url.slice(publicUrl.length + 1)
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }))
  } catch {
    // Storage não configurado, ou arquivo já não existe — não é um erro fatal
    // pro fluxo de troca de avatar, só deixa de limpar o arquivo antigo.
  }
}
