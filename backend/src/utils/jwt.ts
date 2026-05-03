import crypto from 'crypto'
import { config } from '../config'

interface JwtPayload {
  userId: number
  platform: 'wechat' | 'douyin'
  iat: number
  exp: number
}

function base64urlEncode(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8')
}

function sign(data: string): string {
  return crypto
    .createHmac('sha256', config.jwt.secret)
    .update(data)
    .digest('base64url')
}

export function createToken(userId: number, platform: 'wechat' | 'douyin'): string {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64urlEncode(
    JSON.stringify({
      userId,
      platform,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 天
    })
  )
  const signature = sign(`${header}.${payload}`)
  return `${header}.${payload}.${signature}`
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const [header, payload, signature] = token.split('.')
    const expected = sign(`${header}.${payload}`)
    if (signature !== expected) return null
    const data = JSON.parse(base64urlDecode(payload)) as JwtPayload
    if (data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}
