import axios from 'axios'
import crypto from 'crypto'
import { config } from '../config'
import { v4 as uuid } from 'uuid'

export type Platform = 'wechat' | 'douyin'

export interface CreateOrderParams {
  platform: Platform
  openid: string
  outTradeNo: string
  amount: number   // 元
  credits: number
  packId: string
}

export interface PaymentResult {
  /** 微信: prepay_id 组合的参数; 抖音: order_id */
  payParams: Record<string, string>
}

// ──────────────────────────────────────────────
// 微信支付 v2（JSAPI）
// ──────────────────────────────────────────────
function wechatSign(params: Record<string, string>): string {
  const str =
    Object.keys(params)
      .sort()
      .filter((k) => k !== 'sign' && params[k])
      .map((k) => `${k}=${params[k]}`)
      .join('&') + `&key=${config.wechat.mchKey}`
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
}

function obj2xml(obj: Record<string, string>): string {
  return (
    '<xml>' +
    Object.entries(obj)
      .map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
      .join('') +
    '</xml>'
  )
}

function xml2obj(xml: string): Record<string, string> {
  const result: Record<string, string> = {}
  const re = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) result[m[1]] = m[2]
  return result
}

async function createWechatOrder(params: CreateOrderParams): Promise<PaymentResult> {
  const body = {
    appid: config.wechat.appId,
    mch_id: config.wechat.mchId,
    nonce_str: uuid().replace(/-/g, ''),
    body: `积分充值-${params.credits}积分`,
    out_trade_no: params.outTradeNo,
    total_fee: String(Math.round(params.amount * 100)), // 分
    spbill_create_ip: '127.0.0.1',
    notify_url: config.wechat.notifyUrl,
    trade_type: 'JSAPI',
    openid: params.openid,
  }
  const sign = wechatSign(body)
  const xml = obj2xml({ ...body, sign })

  const res = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
    headers: { 'Content-Type': 'text/xml' },
  })
  const result = xml2obj(res.data as string)
  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    throw new Error(`微信统一下单失败: ${result.return_msg || result.err_code_des}`)
  }

  const prepayId = result.prepay_id
  const payParams: Record<string, string> = {
    appId: config.wechat.appId,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: uuid().replace(/-/g, ''),
    package: `prepay_id=${prepayId}`,
    signType: 'MD5',
  }
  payParams.paySign = wechatSign(payParams)
  return { payParams }
}

// ──────────────────────────────────────────────
// 抖音支付
// ──────────────────────────────────────────────
async function createDouyinOrder(params: CreateOrderParams): Promise<PaymentResult> {
  const body = {
    app_id: config.douyin.appId,
    out_order_no: params.outTradeNo,
    total_amount: Math.round(params.amount * 100), // 分
    subject: `积分充值-${params.credits}积分`,
    body: `购买${params.credits}积分`,
    valid_time: 3600,
    notify_url: config.douyin.notifyUrl,
    open_id: params.openid,
    trade_type: 'H5',
  }

  // 签名：所有参数字典序拼接 + app_secret
  const signStr =
    Object.keys(body)
      .sort()
      .map((k) => `${k}=${(body as any)[k]}`)
      .join('&') + `&app_secret=${config.douyin.appSecret}`
  const sign = crypto.createHash('md5').update(signStr).digest('hex')

  const res = await axios.post(
    'https://developer.toutiao.com/api/apps/ecpay/v1/create_order',
    { ...body, sign },
    { headers: { 'Content-Type': 'application/json' } }
  )

  const data = res.data as any
  if (data.err_no !== 0) {
    throw new Error(`抖音支付下单失败: ${data.err_tips}`)
  }

  return {
    payParams: {
      order_id: data.data.order_id,
      order_token: data.data.order_token,
    },
  }
}

// ──────────────────────────────────────────────
// 统一入口
// ──────────────────────────────────────────────
export async function createPaymentOrder(params: CreateOrderParams): Promise<PaymentResult> {
  if (params.platform === 'wechat') return createWechatOrder(params)
  return createDouyinOrder(params)
}

// ──────────────────────────────────────────────
// 回调验签
// ──────────────────────────────────────────────
export function verifyWechatCallback(body: Record<string, string>): boolean {
  const sign = body.sign
  const expected = wechatSign(body)
  return sign === expected
}

export function verifyDouyinCallback(
  params: Record<string, string>,
  token: string
): boolean {
  // 抖音签名: sort([token, timestamp, nonce, msg]) → sha1 → hex
  const arr = [token, params.timestamp, params.nonce, params.msg ?? ''].sort()
  const hash = crypto.createHash('sha1').update(arr.join('')).digest('hex')
  return hash === params.msg_signature
}
