import { useUserStore } from '../store/user'

const BASE_URL = 'https://your-domain.com'  // 替换为实际后端域名

function request<T = any>(
  method: 'GET' | 'POST',
  path: string,
  data?: Record<string, any>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const userStore = useUserStore()
    const token = userStore.token

    uni.request({
      url: BASE_URL + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        const body = res.data as any
        if (body.code === 0) {
          resolve(body.data)
        } else if (body.code === 401) {
          userStore.logout()
          uni.navigateTo({ url: '/pages/index/index' })
          reject(new Error(body.message))
        } else {
          uni.showToast({ title: body.message || '请求失败', icon: 'none' })
          reject(new Error(body.message))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
export const authApi = {
  login: (platform: string, code: string, nickname?: string, avatar?: string) =>
    request<{ token: string; user: any }>('POST', '/api/auth/login', {
      platform,
      code,
      nickname,
      avatar,
    }),

  me: () => request<any>('GET', '/api/auth/me'),
}

// ──────────────────────────────────────────────
// Enhance
// ──────────────────────────────────────────────
export const enhanceApi = {
  upload: (filePath: string, type: 'normal' | 'hd'): Promise<any> => {
    return new Promise((resolve, reject) => {
      const userStore = useUserStore()
      uni.uploadFile({
        url: `${BASE_URL}/api/enhance/upload?type=${type}`,
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${userStore.token}` },
        success: (res) => {
          const body = JSON.parse(res.data)
          if (body.code === 0) resolve(body.data)
          else reject(new Error(body.message))
        },
        fail: reject,
      })
    })
  },

  getResult: (id: number) => request<any>('GET', `/api/enhance/${id}`),

  getHistory: (page = 1) => request<any[]>('GET', `/api/enhance/history/list?page=${page}`),
}

// ──────────────────────────────────────────────
// Order
// ──────────────────────────────────────────────
export const orderApi = {
  getPacks: () => request<any[]>('GET', '/api/packs'),

  createOrder: (packId: string) =>
    request<{ orderId: number; outTradeNo: string; payParams: any }>('POST', '/api/order/create', {
      packId,
    }),

  getOrderStatus: (outTradeNo: string) =>
    request<{ status: string; credits: number }>('GET', `/api/order/${outTradeNo}`),
}
