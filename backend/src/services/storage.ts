/**
 * 本地文件存储（替代 OSS）
 * 文件保存在 UPLOAD_DIR，通过 /uploads/* 静态路由对外访问
 */
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { config } from '../config'

export const UPLOAD_DIR = path.resolve(process.cwd(), config.storage.uploadDir)

// 启动时确保目录存在
for (const sub of ['originals', 'enhanced']) {
  fs.mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true })
}

/** 将 buffer 写入本地，返回相对 key（同 OSS key 格式，兼容数据库字段） */
export async function uploadBuffer(
  buffer: Buffer,
  ext: string,
  folder: 'originals' | 'enhanced'
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10)
  const dir  = path.join(UPLOAD_DIR, folder, date)
  fs.mkdirSync(dir, { recursive: true })

  const filename = `${uuid()}.${ext}`
  fs.writeFileSync(path.join(dir, filename), buffer)

  return `${folder}/${date}/${filename}`   // 与 OSS key 同格式
}

/** 读取本地文件为 buffer */
export async function downloadToBuffer(key: string): Promise<Buffer> {
  return fs.readFileSync(path.join(UPLOAD_DIR, key))
}

/** 构建可访问 URL（相对路径，由 Fastify static 托管） */
export function buildUrl(key: string): string {
  return `${config.storage.baseUrl}/uploads/${key}`
}
