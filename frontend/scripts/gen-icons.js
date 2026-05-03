/**
 * 生成 tabbar 图标 PNG（无外部依赖，纯 Node.js）
 * 运行: node scripts/gen-icons.js
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '../src/static')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

// ── PNG 编码 ──────────────────────────────────────────────
function crc32(buf) {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  let crc = 0xffffffff
  for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function mkChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const tb  = Buffer.from(type)
  const body = Buffer.concat([tb, data])
  const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// drawFn(x, y, size) → [r, g, b, a]
function makePNG(size, drawFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6  // RGBA

  const rows = []
  for (let y = 0; y < size; y++) {
    rows.push(0)
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawFn(x, y, size)
      rows.push(r, g, b, a)
    }
  }
  const idat = zlib.deflateSync(Buffer.from(rows))
  return Buffer.concat([sig, mkChunk('IHDR', ihdr), mkChunk('IDAT', idat), mkChunk('IEND', Buffer.alloc(0))])
}

// ── 工具函数 ──────────────────────────────────────────────
const TRANSPARENT = [0, 0, 0, 0]

function dist(x, y, cx, cy) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh
}

// ── 图标绘制函数 ──────────────────────────────────────────

// 房子形状（首页）
function drawHome(color) {
  return (x, y, s) => {
    const cx = s / 2, t = 4, b = s - 4
    const roofH = Math.round(s * 0.45)
    const bodyY = t + roofH - 2

    // 屋顶：三角形
    const roofSlope = (cx - t) / roofH
    const roofLeft  = cx - (y - t) * roofSlope
    const roofRight = cx + (y - t) * roofSlope
    if (y >= t && y < bodyY && x >= roofLeft && x <= roofRight) {
      const edge = Math.abs(x - roofLeft) < 1.5 || Math.abs(x - roofRight) < 1.5 || y < t + 2
      return edge ? [...color, 255] : [...color, 180]
    }

    // 门洞
    const doorW = Math.round(s * 0.22), doorH = Math.round(s * 0.30)
    const doorX = Math.round(cx - doorW / 2), doorY = b - doorH
    if (inRect(x, y, doorX, doorY, doorW, doorH)) return TRANSPARENT

    // 房身
    const bodyX = Math.round(cx - s * 0.35)
    const bodyW  = Math.round(s * 0.70)
    if (inRect(x, y, bodyX, bodyY, bodyW, b - bodyY)) return [...color, 255]

    return TRANSPARENT
  }
}

// 时钟形状（历史）
function drawClock(color) {
  return (x, y, s) => {
    const cx = s / 2, cy = s / 2
    const r = s / 2 - 4
    const d = dist(x, y, cx, cy)
    if (d > r + 0.5) return TRANSPARENT
    if (d > r - 3)   return [...color, 255]   // 表盘边框

    // 时针（竖线偏短）
    if (Math.abs(x - cx) < 2 && y < cy && y > cy - r * 0.55) return [...color, 255]
    // 分针（横线偏长）
    if (Math.abs(y - cy) < 2 && x > cx && x < cx + r * 0.65) return [...color, 255]
    // 中心点
    if (d < 2.5) return [...color, 255]

    return [...color, 60]  // 表盘浅色填充
  }
}

// 钻石形状（充值）
function drawDiamond(color) {
  return (x, y, s) => {
    const cx = s / 2, cy = s / 2
    const hw = s / 2 - 4  // half width
    const hh = s / 2 - 4  // half height
    const topH = hh * 0.35  // 上部高度比例

    // 钻石轮廓：上梯形 + 下三角
    let inside = false
    if (y < cy - hh + topH * 2) {
      // 上梯形
      const frac = (y - (cy - hh)) / (topH * 2)
      const w = hw * (0.5 + 0.5 * frac)
      inside = Math.abs(x - cx) < w
    } else {
      // 下三角
      const frac = (y - (cy - hh + topH * 2)) / (hh * 2 - topH * 2)
      const w = hw * (1 - frac)
      inside = Math.abs(x - cx) < w
    }

    if (!inside) return TRANSPARENT

    // 分割线增加立体感
    const isEdge = Math.abs(Math.abs(x - cx) - (y < cy ? (cy - y) * 0.6 : 0)) < 1.5
    return [...color, isEdge ? 255 : 200]
  }
}

// ── 生成所有图标 ──────────────────────────────────────────
const SIZE = 60
const GRAY   = [120, 120, 130]  // 未选中
const ORANGE = [245, 166, 35]   // 选中

const icons = [
  { name: 'tab-home',     fn: drawHome,    color: GRAY   },
  { name: 'tab-home-active',   fn: drawHome,    color: ORANGE },
  { name: 'tab-history', fn: drawClock,   color: GRAY   },
  { name: 'tab-history-active',fn: drawClock,   color: ORANGE },
  { name: 'tab-recharge',fn: drawDiamond, color: GRAY   },
  { name: 'tab-recharge-active',fn:drawDiamond, color: ORANGE },
]

for (const icon of icons) {
  const buf = makePNG(SIZE, icon.fn(icon.color))
  const outPath = path.join(OUT_DIR, `${icon.name}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`✓ ${icon.name}.png  (${buf.length} bytes)`)
}

console.log('\nAll icons generated in src/static/')
