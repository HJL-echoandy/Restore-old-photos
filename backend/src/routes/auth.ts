import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { config } from '../config'
import { findOrCreateUser } from '../models/user'
import { createToken } from '../utils/jwt'
import { z } from 'zod'

const loginSchema = z.object({
  platform: z.enum(['wechat', 'douyin']),
  code: z.string().min(1),
  nickname: z.string().optional(),
  avatar: z.string().optional(),
})

async function getWechatOpenid(code: string): Promise<string> {
  const res = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid: config.wechat.appId,
      secret: config.wechat.appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    },
  })
  const data = res.data as any
  if (data.errcode) throw new Error(`微信登录失败: ${data.errmsg}`)
  return data.openid as string
}

async function getDouyinOpenid(code: string): Promise<string> {
  const res = await axios.post('https://developer.toutiao.com/api/apps/v2/jscode2session', {
    appid: config.douyin.appId,
    secret: config.douyin.appSecret,
    code,
    anonymous_code: '',
  })
  const data = res.data as any
  if (data.err_no !== 0) throw new Error(`抖音登录失败: ${data.err_tips}`)
  return data.data.openid as string
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ code: 400, message: '参数错误', errors: body.error.issues })
    }

    const { platform, code, nickname = '', avatar = '' } = body.data

    let openid: string
    try {
      openid =
        platform === 'wechat'
          ? await getWechatOpenid(code)
          : await getDouyinOpenid(code)
    } catch (e: any) {
      return reply.status(400).send({ code: 400, message: e.message })
    }

    const user = await findOrCreateUser(platform, openid, nickname, avatar)
    const token = createToken(user.id, platform)

    return {
      code: 0,
      data: {
        token,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          credits: user.credits,
        },
      },
    }
  })

  // 获取当前用户信息
  app.get('/me', async (req, reply) => {
    const { getUserById } = await import('../models/user')
    const userId = (req as any).userId as number
    const user = await getUserById(userId)
    if (!user) return reply.status(404).send({ code: 404, message: '用户不存在' })
    return {
      code: 0,
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        credits: user.credits,
        total_spent: user.total_spent,
        created_at: user.created_at,
      },
    }
  })
}
