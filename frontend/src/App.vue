<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './store/user'

onLaunch(() => {
  // #ifndef MP-WEIXIN MP-TOUTIAO
  // H5 开发时自动注入 mock 用户，直接看页面效果
  const store = useUserStore()
  if (!store.isLoggedIn) {
    store.setToken('mock_dev_token')
    store.setUserInfo({ id: 1, nickname: '测试用户', avatar: '', credits: 88, total_spent: 0 })
  }
  // #endif
})

onShow(() => {})
</script>

<style>
page {
  background-color: #0f0f23;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}
</style>
