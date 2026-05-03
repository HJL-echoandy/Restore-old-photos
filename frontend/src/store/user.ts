import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(uni.getStorageSync('token') || '')
  const userInfo = ref<{
    id: number
    nickname: string
    avatar: string
    credits: number
    total_spent: number
  } | null>(JSON.parse(uni.getStorageSync('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)
  const credits = computed(() => userInfo.value?.credits ?? 0)

  function setToken(t: string) {
    token.value = t
    uni.setStorageSync('token', t)
  }

  function setUserInfo(info: typeof userInfo.value) {
    userInfo.value = info
    uni.setStorageSync('userInfo', JSON.stringify(info))
  }

  function updateCredits(newCredits: number) {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, credits: newCredits }
      uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
  }

  return { token, userInfo, isLoggedIn, credits, setToken, setUserInfo, updateCredits, logout }
})
