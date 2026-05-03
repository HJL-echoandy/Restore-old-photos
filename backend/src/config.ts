import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'photo_restore',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // 本地存储（暂不用 OSS）
  storage: {
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    // 对外访问的 base URL，生产时改为服务器域名
    baseUrl: process.env.SERVER_BASE_URL || 'http://localhost:3000',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },

  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    mchKey: process.env.WECHAT_MCH_KEY || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
  },

  douyin: {
    appId: process.env.DOUYIN_APP_ID || '',
    appSecret: process.env.DOUYIN_APP_SECRET || '',
    notifyUrl: process.env.DOUYIN_NOTIFY_URL || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  },

  credits: {
    freeOnRegister: parseInt(process.env.CREDITS_FREE_ON_REGISTER || '3'),
    costNormal: parseInt(process.env.CREDITS_COST_NORMAL || '1'),
    costHd: parseInt(process.env.CREDITS_COST_HD || '2'),
  },

  // 积分包配置
  creditPacks: [
    { id: 'pack_10',  credits: 10,  price: 6.9,  label: '体验包' },
    { id: 'pack_30',  credits: 30,  price: 16.9, label: '标准包' },
    { id: 'pack_100', credits: 100, price: 49.9, label: '超值包' },
    { id: 'pack_500', credits: 500, price: 198,  label: '年卡'   },
  ],
}
