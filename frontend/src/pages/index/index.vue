<template>
  <view class="container">
    <!-- 顶部用户状态栏 -->
    <view class="header">
      <view class="logo">
        <text class="logo-icon">✨</text>
        <text class="logo-text">老照片修复</text>
      </view>
      <view class="credits-badge" @tap="goRecharge">
        <text class="credits-icon">💎</text>
        <text class="credits-num">{{ userStore.credits }}</text>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!userStore.isLoggedIn" class="login-section">
      <image class="hero-img" src="/static/hero.png" mode="aspectFit" />
      <text class="hero-title">修复珍贵老照片</text>
      <text class="hero-sub">AI 超清修复，让记忆重新焕彩</text>
      <button class="btn-primary" @tap="handleLogin" :loading="loginLoading">
        微信/抖音一键登录
      </button>
    </view>

    <!-- 已登录：上传区域 -->
    <view v-else class="upload-section">
      <!-- 上传区 -->
      <view class="upload-box" @tap="chooseImage">
        <view v-if="!selectedImage" class="upload-placeholder">
          <text class="upload-icon">📷</text>
          <text class="upload-hint">点击选择老照片</text>
          <text class="upload-sub">支持 JPG / PNG，最大 20MB</text>
        </view>
        <image v-else :src="selectedImage" class="preview-img" mode="aspectFit" />
      </view>

      <!-- 修复类型选择 -->
      <view class="type-row">
        <view
          class="type-card"
          :class="{ active: enhanceType === 'normal' }"
          @tap="enhanceType = 'normal'"
        >
          <text class="type-name">标准修复</text>
          <text class="type-cost">1 积分/张</text>
        </view>
        <view
          class="type-card"
          :class="{ active: enhanceType === 'hd' }"
          @tap="enhanceType = 'hd'"
        >
          <text class="type-name">超清 4K</text>
          <text class="type-cost">2 积分/张</text>
        </view>
      </view>

      <!-- 开始修复按钮 -->
      <button
        class="btn-primary btn-enhance"
        :disabled="!selectedImage || enhancing"
        :loading="enhancing"
        @tap="startEnhance"
      >
        {{ enhancing ? '修复中...' : '开始修复' }}
      </button>

      <!-- 积分不足提示 -->
      <view v-if="showLowCredits" class="low-credits-tip">
        <text>积分不足，</text>
        <text class="link" @tap="goRecharge">去充值</text>
      </view>
    </view>

    <!-- 功能说明 -->
    <view class="features">
      <view class="feature-item" v-for="f in features" :key="f.title">
        <text class="f-icon">{{ f.icon }}</text>
        <text class="f-title">{{ f.title }}</text>
        <text class="f-desc">{{ f.desc }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../store/user'
import { getLoginCode, getUserProfile, PLATFORM } from '../../utils/platform'
import { authApi, enhanceApi } from '../../api/index'

const userStore = useUserStore()
const loginLoading = ref(false)
const selectedImage = ref('')
const selectedFilePath = ref('')
const enhanceType = ref<'normal' | 'hd'>('normal')
const enhancing = ref(false)
const showLowCredits = ref(false)

const features = [
  { icon: '🎨', title: 'AI 智能修复', desc: 'GPT-Image-2 驱动，业界领先' },
  { icon: '🔍', title: '超清增强', desc: '最高 4K 分辨率输出' },
  { icon: '⚡', title: '极速处理', desc: '约 30 秒完成修复' },
]

async function handleLogin() {
  loginLoading.value = true
  try {
    const code = await getLoginCode()
    const profile = await getUserProfile()
    const res = await authApi.login(PLATFORM, code, profile.nickname, profile.avatar)
    userStore.setToken(res.token)
    userStore.setUserInfo(res.user)
  } catch (e) {
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    loginLoading.value = false
  }
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed', 'original'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      selectedFilePath.value = res.tempFilePaths[0]
      selectedImage.value = res.tempFilePaths[0]
      showLowCredits.value = false
    },
  })
}

async function startEnhance() {
  if (!selectedFilePath.value || enhancing.value) return
  const cost = enhanceType.value === 'hd' ? 2 : 1
  if (userStore.credits < cost) {
    showLowCredits.value = true
    return
  }

  enhancing.value = true
  showLowCredits.value = false
  try {
    const result = await enhanceApi.upload(selectedFilePath.value, enhanceType.value)
    // 乐观更新积分显示
    userStore.updateCredits(userStore.credits - cost)
    // 跳转结果页轮询
    uni.navigateTo({
      url: `/pages/result/index?id=${result.enhancementId}&originalUrl=${encodeURIComponent(result.originalUrl)}`,
    })
    // 重置
    selectedImage.value = ''
    selectedFilePath.value = ''
  } catch (e: any) {
    if (e.message?.includes('积分不足')) showLowCredits.value = true
  } finally {
    enhancing.value = false
  }
}

function goRecharge() {
  uni.switchTab({ url: '/pages/recharge/index' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #0f0f23;
  padding: 0 32rpx 60rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 48rpx 0 32rpx;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.logo-icon { font-size: 44rpx; }
.logo-text { font-size: 36rpx; font-weight: 700; color: #fff; }

.credits-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(245, 166, 35, 0.15);
  border: 1rpx solid rgba(245, 166, 35, 0.4);
  border-radius: 100rpx;
  padding: 10rpx 24rpx;
}

.credits-icon { font-size: 28rpx; }
.credits-num { font-size: 28rpx; color: #f5a623; font-weight: 600; }

/* 未登录 */
.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80rpx;
  gap: 24rpx;
}

.hero-img { width: 400rpx; height: 300rpx; }
.hero-title { font-size: 48rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 28rpx; color: #888; }

/* 已登录 */
.upload-section { padding-top: 24rpx; }

.upload-box {
  width: 100%;
  height: 500rpx;
  background: rgba(255,255,255,0.05);
  border: 2rpx dashed rgba(255,255,255,0.2);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.upload-icon { font-size: 80rpx; }
.upload-hint { font-size: 32rpx; color: #ccc; }
.upload-sub { font-size: 24rpx; color: #666; }
.preview-img { width: 100%; height: 100%; }

.type-row {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}

.type-card {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 16rpx;
  padding: 28rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s;
}

.type-card.active {
  background: rgba(245, 166, 35, 0.15);
  border-color: #f5a623;
}

.type-name { font-size: 30rpx; color: #fff; font-weight: 600; }
.type-cost { font-size: 24rpx; color: #f5a623; }

.btn-primary {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #f5a623, #e8892b);
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
  border-radius: 48rpx;
  border: none;
  margin-top: 40rpx;
}

.btn-enhance { margin-top: 32rpx; }

.btn-primary[disabled] {
  opacity: 0.5;
}

.low-credits-tip {
  text-align: center;
  font-size: 26rpx;
  color: #888;
  margin-top: 20rpx;
}

.link { color: #f5a623; }

/* 功能说明 */
.features {
  display: flex;
  gap: 20rpx;
  margin-top: 60rpx;
}

.feature-item {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.f-icon { font-size: 48rpx; }
.f-title { font-size: 26rpx; color: #fff; font-weight: 600; }
.f-desc { font-size: 22rpx; color: #777; text-align: center; }
</style>
