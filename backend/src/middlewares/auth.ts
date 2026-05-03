import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../utils/jwt'

// 不需要认证的路径前缀
const PUBLIC_PATHS = [
  '/health',
  '/api/auth/',
  '/api/callback/',
  '/api/packs',
  '/uploads/',
]

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const path = req.url.split('?')[0]
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return

  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) {
    return reply.status(401).send({ code: 401, message: '未登录' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return reply.status(401).send({ code: 401, message: 'token 已过期，请重新登录' })
  }

  // 挂载到 request 上
  ;(req as any).userId = payload.userId
  ;(req as any).platform = payload.platform
}
