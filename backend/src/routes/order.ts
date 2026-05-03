import { FastifyInstance } from 'fastify'
import { config } from '../config'
import { createOrder } from '../models/order'
import { createPaymentOrder } from '../services/payment'
import { z } from 'zod'

const createOrderSchema = z.object({
  packId: z.string().min(1),
})

export async function orderRoutes(app: FastifyInstance) {
  // 创建支付订单
  app.post('/create', async (req, reply) => {
    const userId = (req as any).userId as number
    const platform = (req as any).platform as 'wechat' | 'douyin'

    const body = createOrderSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ code: 400, message: '参数错误' })
    }

    const pack = config.creditPacks.find((p) => p.id === body.data.packId)
    if (!pack) {
      return reply.status(400).send({ code: 400, message: '套餐不存在' })
    }

    // 获取用户 openid（从数据库）
    const { getUserById } = await import('../models/user')
    const user = await getUserById(userId)
    if (!user) return reply.status(404).send({ code: 404, message: '用户不存在' })

    // 写入订单
    const order = await createOrder(userId, platform, pack.id, pack.price, pack.credits)

    // 调用对应平台支付
    const payResult = await createPaymentOrder({
      platform,
      openid: user.openid,
      outTradeNo: order.out_trade_no,
      amount: pack.price,
      credits: pack.credits,
      packId: pack.id,
    })

    return {
      code: 0,
      data: {
        orderId: order.id,
        outTradeNo: order.out_trade_no,
        amount: pack.price,
        credits: pack.credits,
        payParams: payResult.payParams,
      },
    }
  })

  // 查询订单状态
  app.get('/:outTradeNo', async (req, reply) => {
    const userId = (req as any).userId as number
    const outTradeNo = (req.params as any).outTradeNo as string
    const { getOrderByOutTradeNo } = await import('../models/order')
    const order = await getOrderByOutTradeNo(outTradeNo)
    if (!order || order.user_id !== userId) {
      return reply.status(404).send({ code: 404, message: '订单不存在' })
    }
    return { code: 0, data: { status: order.status, credits: order.credits } }
  })
}
