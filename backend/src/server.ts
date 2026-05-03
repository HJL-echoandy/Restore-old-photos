import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import path from 'path'
import { config } from './config'
import { UPLOAD_DIR } from './services/storage'
import { authRoutes } from './routes/auth'
import { enhanceRoutes } from './routes/enhance'
import { orderRoutes } from './routes/order'
import { callbackRoutes } from './routes/callback'
import { authMiddleware } from './middlewares/auth'

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  await app.register(cors, { origin: true })
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  })

  // 托管上传目录，/uploads/* 公开可访问（图片 URL 直接给前端用）
  await app.register(staticFiles, {
    root: UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })

  // 全局认证（白名单：公开路径不需要 token）
  app.addHook('preHandler', authMiddleware)

  await app.register(authRoutes,     { prefix: '/api/auth' })
  await app.register(enhanceRoutes,  { prefix: '/api/enhance' })
  await app.register(orderRoutes,    { prefix: '/api/order' })
  await app.register(callbackRoutes, { prefix: '/api/callback' })

  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))
  app.get('/api/packs', async () => ({ packs: config.creditPacks }))

  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`Server running on port ${config.port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
