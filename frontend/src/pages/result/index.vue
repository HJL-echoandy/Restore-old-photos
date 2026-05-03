<template>
  <view class="container">
    <!-- 处理中 -->
    <view v-if="status === 'processing' || status === 'pending'" class="processing-wrap">
      <view class="spinner" />
      <text class="processing-text">AI 正在修复中...</text>
      <text class="processing-sub">预计需要 20~40 秒，请稍候</text>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progress + '%' }" />
      </view>
    </view>

    <!-- 修复完成：对比展示 -->
    <view v-else-if="status === 'done'" class="result-wrap">
      <text class="result-title">修复完成 ✨</text>

      <!-- 滑动对比 -->
      <view class="compare-container" @touchstart="onTouchStart" @touchmove="onTouchMove">
        <!-- 增强后（底层） -->
        <image class="compare-img" :src="enhancedUrl" mode="aspectFill" />
        <!-- 原图（顶层裁剪） -->
        <view class="compare-original" :style="{ width: sliderX + 'px' }">
          <image class="compare-img" :src="originalUrl" mode="aspectFill" />
        </view>
        <!-- 分割线 -->
        <view class="slider-line" :style="{ left: sliderX + 'px' }">
          <view class="slider-handle">⇔</view>
        </view>
        <!-- 标签 -->
        <text class="label-before">修复前</text>
        <text class="label-after">修复后</text>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <view class="action-btn" @tap="saveImage">
          <text class="action-icon">💾</text>
          <text class="action-label">保存相册</text>
        </view>
        <view class="action-btn" @tap="shareResult">
          <text class="action-icon">📤</text>
          <text class="action-label">分享</text>
        </view>
        <view class="action-btn" @tap="goHome">
          <text class="action-icon">➕</text>
          <text class="action-label">再修一张</text>
        </view>
      </view>
    </view>

    <!-- 修复失败 -->
    <view v-else-if="status === 'failed'" class="failed-wrap">
      <text class="failed-icon">😔</text>
      <text class="failed-text">修复失败，积分已退还</text>
      <text class="failed-sub">{{ errorMsg || '请稍后重试' }}</text>
      <button class="btn-retry" @tap="goHome">返回重试</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { enhanceApi } from '../../api/index'
import { saveImageToAlbum } from '../../utils/platform'

const props = defineProps<{}>()

const enhancementId = ref(0)
const originalUrl = ref('')
const enhancedUrl = ref('')
const status = ref<'pending' | 'processing' | 'done' | 'failed'>('processing')
const progress = ref(0)
const errorMsg = ref('')
const sliderX = ref(0)
const containerWidth = ref(375)

let pollTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
let touchStartX = 0

onMounted(() => {
  // 从路由参数获取
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const query = page.$page?.fullPath?.split('?')[1] || ''
  const params = Object.fromEntries(new URLSearchParams(query))

  enhancementId.value = parseInt(params.id || '0')
  originalUrl.value = decodeURIComponent(params.originalUrl || '')

  // 获取屏幕宽度
  const info = uni.getSystemInfoSync()
  containerWidth.value = info.windowWidth
  sliderX.value = containerWidth.value / 2

  startPoll()
  startProgressAnimation()
})

onUnmounted(() => {
  stopPoll()
  if (progressTimer) clearInterval(progressTimer)
})

function startProgressAnimation() {
  progressTimer = setInterval(() => {
    if (progress.value < 90) progress.value += 2
  }, 600)
}

function startPoll() {
  pollTimer = setInterval(async () => {
    try {
      const result = await enhanceApi.getResult(enhancementId.value)
      status.value = result.status
      if (result.status === 'done') {
        enhancedUrl.value = result.enhancedUrl
        progress.value = 100
        stopPoll()
        if (progressTimer) clearInterval(progressTimer)
      } else if (result.status === 'failed') {
        errorMsg.value = result.error_msg || ''
        stopPoll()
        if (progressTimer) clearInterval(progressTimer)
      }
    } catch {
      // 忽略轮询错误
    }
  }, 3000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
}

function onTouchMove(e: TouchEvent) {
  const x = e.touches[0].clientX
  sliderX.value = Math.max(20, Math.min(containerWidth.value - 20, x))
}

async function saveImage() {
  if (!enhancedUrl.value) return
  try {
    const res = await new Promise<string>((resolve, reject) =>
      uni.downloadFile({
        url: enhancedUrl.value,
        success: (r) => resolve(r.tempFilePath),
        fail: reject,
      })
    )
    await saveImageToAlbum(res)
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

function shareResult() {
  uni.showShareMenu({ withShareTicket: true })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #0f0f23;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 32rpx;
}

/* 处理中 */
.processing-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  padding-top: 120rpx;
}

.spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(245, 166, 35, 0.2);
  border-top-color: #f5a623;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-text { font-size: 36rpx; color: #fff; font-weight: 600; }
.processing-sub { font-size: 26rpx; color: #888; }

.progress-bar {
  width: 480rpx;
  height: 8rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f5a623, #e8892b);
  border-radius: 4rpx;
  transition: width 0.6s ease;
}

/* 结果 */
.result-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.result-title { font-size: 40rpx; font-weight: 700; color: #fff; }

.compare-container {
  width: 100%;
  height: 600rpx;
  position: relative;
  border-radius: 20rpx;
  overflow: hidden;
  background: #111;
}

.compare-img { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }

.compare-original {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  overflow: hidden;
}

.slider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4rpx;
  background: #fff;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-handle {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #333;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.3);
}

.label-before {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.label-after {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  background: rgba(245, 166, 35, 0.8);
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.action-row {
  display: flex;
  gap: 40rpx;
  justify-content: center;
  margin-top: 16rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 20rpx;
  padding: 32rpx 40rpx;
}

.action-icon { font-size: 48rpx; }
.action-label { font-size: 24rpx; color: #ccc; }

/* 失败 */
.failed-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding-top: 120rpx;
}

.failed-icon { font-size: 100rpx; }
.failed-text { font-size: 36rpx; color: #fff; font-weight: 600; }
.failed-sub { font-size: 26rpx; color: #888; }

.btn-retry {
  margin-top: 24rpx;
  width: 300rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #f5a623, #e8892b);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}
</style>
