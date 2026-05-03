/**
 * 平台差异适配层
 * 业务代码通过此层调用，无需关心微信/抖音/H5 差异
 */

// 使用单一变量避免多次 export const 冲突
let _platform: 'wechat' | 'douyin' = 'wechat'

// #ifdef MP-TOUTIAO
_platform = 'douyin'
// #endif

export const PLATFORM = _platform

/** 获取登录 code */
export function getLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.login({
      success: (res: any) => resolve(res.code),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifdef MP-TOUTIAO
    tt.login({
      success: (res: any) => resolve(res.code),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifndef MP-WEIXIN MP-TOUTIAO
    resolve('mock_code_for_h5_dev')
    // #endif
  })
}

/** 获取用户信息（头像、昵称） */
export function getUserProfile(): Promise<{ nickname: string; avatar: string }> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    wx.getUserProfile({
      desc: '用于展示用户头像',
      success: (res: any) => resolve({ nickname: res.userInfo.nickName, avatar: res.userInfo.avatarUrl }),
      fail: () => resolve({ nickname: '', avatar: '' }),
    })
    // #endif

    // #ifdef MP-TOUTIAO
    tt.getUserInfo({
      withCredentials: false,
      success: (res: any) => resolve({ nickname: res.userInfo.nickName, avatar: res.userInfo.avatarUrl }),
      fail: () => resolve({ nickname: '', avatar: '' }),
    })
    // #endif

    // #ifndef MP-WEIXIN MP-TOUTIAO
    resolve({ nickname: '测试用户', avatar: '' })
    // #endif
  })
}

/** 发起支付 */
export function requestPayment(payParams: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.requestPayment({
      ...payParams,
      success: () => resolve(),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifdef MP-TOUTIAO
    tt.pay({
      orderInfo: { order_id: payParams.order_id, order_token: payParams.order_token },
      success: () => resolve(),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifndef MP-WEIXIN MP-TOUTIAO
    setTimeout(() => resolve(), 1000)
    // #endif
  })
}

/** 保存图片到相册 */
export function saveImageToAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifdef MP-TOUTIAO
    tt.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err: any) => reject(err),
    })
    // #endif

    // #ifndef MP-WEIXIN MP-TOUTIAO
    const a = document.createElement('a')
    a.href = filePath
    a.download = 'enhanced.jpg'
    a.click()
    resolve()
    // #endif
  })
}
