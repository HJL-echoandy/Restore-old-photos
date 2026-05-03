import { FastifyInstance } from 'fastify'
import { markOrderPaid } from '../models/order'
import { addCredits, addTotalSpent } from '../models/user'
import { verifyWechatCallback, verifyDouyinCallback } from '../services/payment'

function xml2obj(xml: string): Record<string, string> {
  const result: Record<string, string> = {}
  const re = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) result[m[1]] = m[2]
  return result
}

export async function callbackRoutes(app: FastifyInstance) {
  // 微信支付回调
  app.post('/wechat', { config: { rawBody: true } }, async (req, reply) => {
    const xmlBody = (req.body as any)?.toString?.() || ''
    const params = xml2obj(xmlBody)

    if (!verifyWechatCallback(params)) {
      return reply
        .type('text/xml')
        .send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名失败]]></return_msg></xml>')
    }

    if (params.result_code === 'SUCCESS') {
      const outTradeNo = params.out_trade_no
      const order = await markOrderPaid(outTradeNo)
      if (order) {
        await addCredits(order.user_id, order.credits)
        await addTotalSpent(order.user_id, Number(order.amount))
      }
    }

    return reply
      .type('text/xml')
      .send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
  })

  // 抖音支付回调
  app.post('/douyin', async (req, reply) => {
    const body = req.body as any

    // 抖音用 msg 字段包裹实际数据
    let tradeInfo: any = {}
    try {
      tradeInfo = JSON.parse(body.msg || '{}')
    } catch {
      return reply.send({ err_no: 0, err_tips: 'success' })
    }

    if (tradeInfo.trade_status === 'PAY_SUCCESS') {
      const outTradeNo = tradeInfo.cp_orderno as string
      const order = await markOrderPaid(outTradeNo)
      if (order) {
        await addCredits(order.user_id, order.credits)
        await addTotalSpent(order.user_id, Number(order.amount))
      }
    }

    return { err_no: 0, err_tips: 'success' }
  })
}
