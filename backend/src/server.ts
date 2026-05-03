import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from './config'
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
  // 插件
  await app.register(cors, { origin: true })
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  })

  // 全局认证 hook（排除白名单路径）
  app.addHook('preHandler', authMiddleware)

  // 路由
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(enhanceRoutes, { prefix: '/api/enhance' })
  await app.register(orderRoutes, { prefix: '/api/order' })
  await app.register(callbackRoutes, { prefix: '/api/callback' })

  // 健康检查
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // 积分包列表（公开）
  app.get('/api/packs', async () => ({ packs: config.creditPacks }))

  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`Server running on port ${config.port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
