# 部署指南

## 前置依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 后端运行环境 |
| MySQL | >= 8.0 | 主数据库 |
| Redis | >= 7.0 | 缓存 / 限流 |
| 阿里云 OSS | - | 图片存储 |

---

## 1. 后端部署

### 1.1 安装依赖

```bash
cd backend
npm install
```

### 1.2 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入所有配置项
```

关键配置项说明：

```
OPENAI_API_KEY       OpenAI API Key（需有 gpt-image-1 权限）
OSS_*                阿里云 OSS 配置（region/key/secret/bucket/domain）
WECHAT_APP_ID        微信小程序 AppID
WECHAT_MCH_ID        微信支付商户号
WECHAT_MCH_KEY       微信支付 API Key（v2）
DOUYIN_APP_ID        抖音小程序 AppID
DOUYIN_APP_SECRET    抖音小程序 Secret
JWT_SECRET           至少 32 位随机字符串
```

### 1.3 初始化数据库

```bash
# 方式一：直接执行 SQL
mysql -u root -p < sql/init.sql

# 方式二：用脚本
npm run db:init
```

### 1.4 启动服务

```bash
# 开发
npm run dev

# 生产（建议配合 PM2）
npm run build
pm2 start dist/server.js --name photo-restore
```

### 1.5 Nginx 反向代理（生产必配）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 上传文件需调大 body 限制
        client_max_body_size 25M;
    }
}
```

---

## 2. 前端部署

### 2.1 安装依赖

```bash
cd frontend
npm install
```

### 2.2 修改后端域名

编辑 `frontend/src/api/index.ts`，将 `BASE_URL` 改为实际后端域名：

```ts
const BASE_URL = 'https://your-domain.com'
```

### 2.3 修改小程序 AppID

编辑 `frontend/src/manifest.json`：
- `mp-weixin.appid` → 微信小程序 AppID
- `mp-toutiao.appid` → 抖音小程序 AppID

### 2.4 编译发布

```bash
# 编译微信小程序
npm run build:weapp
# 产物在 dist/mp-weixin/，用微信开发者工具上传

# 编译抖音小程序
npm run build:tt
# 产物在 dist/mp-toutiao/，用抖音开发者工具上传
```

---

## 3. 域名白名单配置

小程序对网络请求有严格限制，需在各平台开发者后台配置：

### 微信
- 登录 mp.weixin.qq.com
- 开发 → 开发设置 → 服务器域名
- 添加 `request 合法域名`：`https://your-domain.com`
- 添加 `uploadFile 合法域名`：`https://your-domain.com`
- 添加 `downloadFile 合法域名`：OSS 域名

### 抖音
- 登录 microapp.bytedance.com
- 配置 → 服务器域名，添加上述域名

---

## 4. 支付配置

### 微信支付
1. 申请商户号：pay.weixin.qq.com
2. 在商户平台配置支付回调域名（填 `WECHAT_NOTIFY_URL`）
3. 关联小程序 AppID 与商户号

### 抖音支付
1. 在抖音开发者平台 → 能力 → 支付 申请开通
2. 配置回调地址（填 `DOUYIN_NOTIFY_URL`）

---

## 5. 积分定价参考

| 套餐 | 积分 | 建议售价 | OpenAI 成本 | 毛利率 |
|------|------|----------|------------|--------|
| 体验包 | 10 | ¥6.9 | ~¥3 | ~57% |
| 标准包 | 30 | ¥16.9 | ~¥9 | ~47% |
| 超值包 | 100 | ¥49.9 | ~¥30 | ~40% |
| 年卡 | 500 | ¥198 | ~¥150 | ~24% |

> OpenAI gpt-image-1 费用约 $0.04/张（1024px），$0.08/张（1536px 超清）
> 按美元兑人民币 7.2 计算

---

## 6. 目录结构说明

```
douyinmini/
├── backend/                 后端 Node.js 服务
│   ├── src/
│   │   ├── config.ts        全局配置（读环境变量）
│   │   ├── server.ts        Fastify 入口
│   │   ├── routes/          API 路由
│   │   │   ├── auth.ts      登录 / 用户信息
│   │   │   ├── enhance.ts   图片上传 & 增强
│   │   │   ├── order.ts     订单创建 & 查询
│   │   │   └── callback.ts  微信/抖音支付回调
│   │   ├── services/
│   │   │   ├── openai.ts    GPT-Image-2 调用封装
│   │   │   ├── oss.ts       阿里云 OSS 封装
│   │   │   └── payment.ts   微信/抖音支付统一封装
│   │   ├── models/          数据库操作层
│   │   ├── middlewares/     JWT 认证中间件
│   │   └── utils/           db / redis / jwt 工具
│   └── sql/init.sql         建表 SQL
│
└── frontend/                uni-app 前端
    └── src/
        ├── pages/
        │   ├── index/       首页（上传）
        │   ├── result/      修复结果（滑动对比）
        │   ├── history/     历史记录
        │   └── recharge/    充值页
        ├── store/user.ts    Pinia 用户状态
        ├── api/index.ts     API 请求封装
        └── utils/platform.ts 微信/抖音差异适配层
```
