import { FastifyInstance } from 'fastify'
import { config } from '../config'
import { deductCredits } from '../models/user'
import {
  createEnhancement,
  updateEnhancementDone,
  updateEnhancementFailed,
  updateEnhancementProcessing,
  getEnhancementById,
  listEnhancements,
} from '../models/enhancement'
import { uploadBuffer, downloadToBuffer, buildUrl } from '../services/oss'
import { enhancePhoto, EnhanceType } from '../services/openai'
import { redisIncr } from '../utils/redis'

const DAILY_FREE_LIMIT = 3  // 免费用户每天额外保护限流（已扣积分为准）

export async function enhanceRoutes(app: FastifyInstance) {
  // 上传原图 + 触发增强（同步，适合小文件）
  app.post('/upload', async (req, reply) => {
    const userId = (req as any).userId as number
    const platform = (req as any).platform as string

    const data = await req.file()
    if (!data) return reply.status(400).send({ code: 400, message: '请上传图片' })

    const mimetype = data.mimetype
    if (!mimetype.startsWith('image/')) {
      return reply.status(400).send({ code: 400, message: '只支持图片文件' })
    }

    const typeParam = (req.query as any).type as string | undefined
    const enhanceType: EnhanceType = typeParam === 'hd' ? 'hd' : 'normal'
    const creditsCost =
      enhanceType === 'hd' ? config.credits.costHd : config.credits.costNormal

    // 扣积分（原子操作）
    const ok = await deductCredits(userId, creditsCost)
    if (!ok) {
      return reply.status(402).send({ code: 402, message: '积分不足，请充值' })
    }

    // 读取上传文件
    const buffer = await data.toBuffer()
    const ext = mimetype.split('/')[1]?.split('+')[0] || 'jpeg'

    // 存原图到 OSS
    const originalKey = await uploadBuffer(buffer, ext, 'originals')

    // 创建增强记录
    const enhId = await createEnhancement(userId, originalKey, enhanceType, creditsCost)
    await updateEnhancementProcessing(enhId)

    // 异步处理（不阻塞响应），先返回 id
    setImmediate(async () => {
      try {
        const enhancedBuffer = await enhancePhoto(buffer, `photo.${ext}`, enhanceType)
        const enhancedKey = await uploadBuffer(enhancedBuffer, 'jpg', 'enhanced')
        await updateEnhancementDone(enhId, enhancedKey)
      } catch (err: any) {
        await updateEnhancementFailed(enhId, err.message || 'unknown error')
        // 退还积分
        const { addCredits } = await import('../models/user')
        await addCredits(userId, creditsCost)
      }
    })

    return {
      code: 0,
      data: {
        enhancementId: enhId,
        originalUrl: buildUrl(originalKey),
        status: 'processing',
      },
    }
  })

  // 查询单条增强结果
  app.get('/:id', async (req, reply) => {
    const userId = (req as any).userId as number
    const id = parseInt((req.params as any).id)

    const item = await getEnhancementById(id)
    if (!item || item.user_id !== userId) {
      return reply.status(404).send({ code: 404, message: '记录不存在' })
    }

    return {
      code: 0,
      data: {
        ...item,
        originalUrl: buildUrl(item.original_key),
        enhancedUrl: item.enhanced_key ? buildUrl(item.enhanced_key) : null,
      },
    }
  })

  // 历史记录列表
  app.get('/history/list', async (req, reply) => {
    const userId = (req as any).userId as number
    const page = parseInt((req.query as any).page || '1')
    const pageSize = Math.min(parseInt((req.query as any).pageSize || '20'), 50)

    const list = await listEnhancements(userId, page, pageSize)

    return {
      code: 0,
      data: list.map((item) => ({
        ...item,
        originalUrl: buildUrl(item.original_key),
        enhancedUrl: item.enhanced_key ? buildUrl(item.enhanced_key) : null,
      })),
    }
  })
}
