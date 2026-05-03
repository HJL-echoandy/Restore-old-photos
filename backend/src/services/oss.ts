import OSS from 'ali-oss'
import { config } from '../config'
import { v4 as uuid } from 'uuid'

let client: OSS

function getClient(): OSS {
  if (!client) {
    client = new OSS({
      region: config.oss.region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
      bucket: config.oss.bucket,
    })
  }
  return client
}

export function buildUrl(key: string): string {
  return `${config.oss.domain}/${key}`
}

export async function uploadBuffer(
  buffer: Buffer,
  ext: string,
  folder: 'originals' | 'enhanced'
): Promise<string> {
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${uuid()}.${ext}`
  await getClient().put(key, buffer)
  return key
}

export async function getSignedUploadUrl(
  ext: string,
  folder: 'originals' | 'enhanced'
): Promise<{ url: string; key: string }> {
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${uuid()}.${ext}`
  const url = getClient().signatureUrl(key, {
    method: 'PUT',
    expires: 300, // 5 分钟有效
    'Content-Type': `image/${ext}`,
  })
  return { url, key }
}

export async function downloadToBuffer(key: string): Promise<Buffer> {
  const result = await getClient().get(key)
  return result.content as Buffer
}
