<template>
  <view class="container">
    <!-- 积分余额展示 -->
    <view class="balance-card">
      <text class="balance-label">当前积分</text>
      <view class="balance-row">
        <text class="balance-icon">💎</text>
        <text class="balance-num">{{ userStore.credits }}</text>
      </view>
      <text class="balance-tip">每张照片消耗 1~2 积分</text>
    </view>

    <!-- 套餐列表 -->
    <text class="section-title">选择充值套餐</text>

    <view class="packs-grid">
      <view
        v-for="pack in packs"
        :key="pack.id"
        class="pack-card"
        :class="{ selected: selectedPack?.id === pack.id, popular: pack.id === 'pack_100' }"
        @tap="selectedPack = pack"
      >
        <view v-if="pack.id === 'pack_100'" class="popular-tag">最划算</view>
        <text class="pack-label">{{ pack.label }}</text>
        <view class="pack-credits-row">
          <text class="pack-credits">{{ pack.credits }}</text>
          <text class="pack-credits-unit">积分</text>
        </view>
        <text class="pack-price">¥{{ pack.price }}</text>
        <text class="pack-unit-price">¥{{ (pack.price / pack.credits).toFixed(2) }}/张</text>
      </view>
    </view>

    <!-- 权益说明 -->
    <view class="benefits">
      <view class="benefit-item" v-for="b in benefits" :key="b">
        <text class="benefit-check">✓</text>
        <text class="benefit-text">{{ b }}</text>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="pay-footer">
      <view v-if="selectedPack" class="pay-summary">
        <text class="pay-amount">¥{{ selectedPack.price }}</text>
        <text class="pay-get">获得 {{ selectedPack.credits }} 积分</text>
      </view>
      <button
        class="btn-pay"
        :disabled="!selectedPack || paying"
        :loading="paying"
        @tap="handlePay"
      >
        {{ paying ? '支付中...' : '立即充值' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { orderApi, authApi } from '../../api/index'
import { requestPayment } from '../../utils/platform'

const userStore = useUserStore()

interface Pack {
  id: string
  credits: number
  price: number
  label: string
}

const packs = ref<Pack[]>([])
const selectedPack = ref<Pack | null>(null)
const paying = ref(false)

const benefits = [
  '积分永久有效，不过期',
  '修复失败自动退还积分',
  '支持微信 / 抖音支付',
  '超清 4K 无限制使用',
]

onMounted(async () => {
  try {
    packs.value = await orderApi.getPacks()
    selectedPack.value = packs.value.find((p) => p.id === 'pack_30') || packs.value[0] || null
  } catch {
    uni.showToast({ title: '加载套餐失败', icon: 'none' })
  }
})

async function handlePay() {
  if (!selectedPack.value || paying.value) return
  paying.value = true

  try {
    // 创建订单
    const orderRes = await orderApi.createOrder(selectedPack.value.id)

    // 调起支付
    await requestPayment(orderRes.payParams)

    // 轮询订单状态（最多等 30 秒）
    for (let i = 0; i < 10; i++) {
      await sleep(3000)
      const st = await orderApi.getOrderStatus(orderRes.outTradeNo)
      if (st.status === 'paid') {
        // 刷新用户信息
        const me = await authApi.me()
        userStore.updateCredits(me.credits)
        uni.showToast({ title: `充值成功！+${st.credits}积分`, icon: 'success' })
        return
      }
    }

    uni.showToast({ title: '支付结果确认中，请稍后刷新', icon: 'none' })
  } catch (e: any) {
    if (e?.errMsg?.includes('cancel')) {
      // 用户主动取消，不提示
    } else {
      uni.showToast({ title: '支付失败，请重试', icon: 'none' })
    }
  } finally {
    paying.value = false
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #0f0f23;
  padding: 32rpx 32rpx 180rpx;
}

.balance-card {
  background: linear-gradient(135deg, #1a1a3e, #2a1a4e);
  border: 1rpx solid rgba(245,166,35,0.3);
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
  margin-bottom: 48rpx;
}

.balance-label { font-size: 28rpx; color: #aaa; display: block; margin-bottom: 16rpx; }

.balance-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.balance-icon { font-size: 56rpx; }
.balance-num { font-size: 80rpx; font-weight: 700; color: #f5a623; }
.balance-tip { font-size: 24rpx; color: #666; }

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  display: block;
  margin-bottom: 28rpx;
}

.packs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-bottom: 48rpx;
}

.pack-card {
  background: rgba(255,255,255,0.05);
  border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  position: relative;
  transition: all 0.2s;
}

.pack-card.selected {
  background: rgba(245, 166, 35, 0.12);
  border-color: #f5a623;
}

.pack-card.popular {
  border-color: rgba(245, 166, 35, 0.4);
}

.popular-tag {
  position: absolute;
  top: -1rpx;
  right: -1rpx;
  background: #f5a623;
  color: #fff;
  font-size: 20rpx;
  padding: 6rpx 16rpx;
  border-radius: 0 20rpx 0 12rpx;
}

.pack-label { font-size: 28rpx; color: #aaa; }

.pack-credits-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.pack-credits { font-size: 56rpx; font-weight: 700; color: #fff; }
.pack-credits-unit { font-size: 24rpx; color: #888; }

.pack-price { font-size: 36rpx; font-weight: 600; color: #f5a623; }
.pack-unit-price { font-size: 22rpx; color: #666; }

.benefits { margin-bottom: 32rpx; }

.benefit-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(255,255,255,0.05);
}

.benefit-check { color: #4caf50; font-size: 28rpx; }
.benefit-text { font-size: 28rpx; color: #ccc; }

/* 底部固定按钮 */
.pay-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 15, 35, 0.95);
  backdrop-filter: blur(20rpx);
  padding: 24rpx 32rpx 60rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-top: 1rpx solid rgba(255,255,255,0.08);
}

.pay-summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.pay-amount { font-size: 40rpx; font-weight: 700; color: #f5a623; }
.pay-get { font-size: 24rpx; color: #888; }

.btn-pay {
  width: 280rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #f5a623, #e8892b);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 44rpx;
  border: none;
  flex-shrink: 0;
}

.btn-pay[disabled] { opacity: 0.5; }
</style>
