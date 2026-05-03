<template>
  <view class="container">
    <view v-if="loading && list.length === 0" class="loading-wrap">
      <view class="spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="list.length === 0" class="empty-wrap">
      <text class="empty-icon">🖼️</text>
      <text class="empty-text">暂无修复记录</text>
      <button class="btn-go" @tap="goHome">去修复一张</button>
    </view>

    <scroll-view v-else scroll-y class="list" @scrolltolower="loadMore">
      <view v-for="item in list" :key="item.id" class="card" @tap="viewResult(item)">
        <!-- 缩略图 -->
        <view class="thumb-row">
          <view class="thumb-wrap">
            <image class="thumb" :src="item.originalUrl" mode="aspectFill" />
            <text class="thumb-label">原图</text>
          </view>
          <text class="arrow">→</text>
          <view class="thumb-wrap">
            <image
              v-if="item.enhancedUrl"
              class="thumb"
              :src="item.enhancedUrl"
              mode="aspectFill"
            />
            <view v-else class="thumb-placeholder">
              <text>{{ statusText(item.status) }}</text>
            </view>
            <text class="thumb-label">修复后</text>
          </view>
        </view>

        <!-- 状态 & 信息 -->
        <view class="card-footer">
          <view class="tag" :class="'tag-' + item.status">{{ statusText(item.status) }}</view>
          <text class="card-type">{{ item.type === 'hd' ? '超清 4K' : '标准修复' }}</text>
          <text class="card-date">{{ formatDate(item.created_at) }}</text>
        </view>
      </view>

      <view v-if="noMore" class="no-more">已加载全部记录</view>
      <view v-else-if="loading" class="load-more-tip">加载中...</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { enhanceApi } from '../../api/index'

interface Enhancement {
  id: number
  status: 'pending' | 'processing' | 'done' | 'failed'
  type: 'normal' | 'hd'
  originalUrl: string
  enhancedUrl: string | null
  created_at: string
}

const list = ref<Enhancement[]>([])
const loading = ref(false)
const page = ref(1)
const noMore = ref(false)

onMounted(() => loadList())

async function loadList(reset = false) {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    if (reset) { list.value = []; page.value = 1; noMore.value = false }
    const res = await enhanceApi.getHistory(page.value)
    list.value.push(...res)
    if (res.length < 20) noMore.value = true
    else page.value++
  } finally {
    loading.value = false
  }
}

function loadMore() { loadList() }

function viewResult(item: Enhancement) {
  if (item.status !== 'done') return
  uni.navigateTo({
    url: `/pages/result/index?id=${item.id}&originalUrl=${encodeURIComponent(item.originalUrl)}`,
  })
}

function statusText(s: string) {
  return { pending: '等待中', processing: '修复中', done: '已完成', failed: '失败' }[s] || s
}

function formatDate(d: string) {
  return d?.slice(0, 16).replace('T', ' ') || ''
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.container { min-height: 100vh; background: #0f0f23; padding: 32rpx; }

.loading-wrap, .empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  gap: 32rpx;
}

.spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid rgba(245,166,35,0.2);
  border-top-color: #f5a623;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text { color: #888; font-size: 28rpx; }
.empty-icon { font-size: 100rpx; }
.empty-text { font-size: 32rpx; color: #888; }

.btn-go {
  margin-top: 16rpx;
  background: linear-gradient(135deg, #f5a623, #e8892b);
  color: #fff;
  border-radius: 40rpx;
  border: none;
  font-size: 30rpx;
  padding: 20rpx 60rpx;
}

.list { height: calc(100vh - 64rpx); }

.card {
  background: rgba(255,255,255,0.05);
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.thumb-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.thumb-wrap {
  flex: 1;
  position: relative;
}

.thumb {
  width: 100%;
  height: 180rpx;
  border-radius: 12rpx;
  background: #222;
}

.thumb-placeholder {
  width: 100%;
  height: 180rpx;
  border-radius: 12rpx;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #666;
}

.thumb-label {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.arrow { font-size: 32rpx; color: #f5a623; flex-shrink: 0; }

.card-footer {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.tag-done { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
.tag-processing { background: rgba(245, 166, 35, 0.2); color: #f5a623; }
.tag-pending { background: rgba(255,255,255,0.1); color: #aaa; }
.tag-failed { background: rgba(244, 67, 54, 0.2); color: #f44336; }

.card-type { font-size: 24rpx; color: #888; flex: 1; }
.card-date { font-size: 22rpx; color: #666; }

.no-more, .load-more-tip {
  text-align: center;
  color: #666;
  font-size: 24rpx;
  padding: 32rpx 0;
}
</style>
