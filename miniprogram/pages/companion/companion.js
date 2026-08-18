const flux = require('../../utils/flux.js')

/* 陪伴页烟雾主题：天空淡蓝 */
const FLUX_THEME = {
  c1: [0.55, 0.80, 1.00],
  c2: [0.35, 0.62, 0.95],
  c3: [0.20, 0.42, 0.90],
  seed: 4.5
}

const STORAGE_KEY = 'companions'
const MAX_RECORDS = 100
const HEART_POOL = ['💗', '❤️', '💕', '💖', '💓', '🩷', '💘', '💝']
let heartSeq = 0

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/* 「刚刚」或 M月D日 HH:mm */
function formatTime(ts) {
  if (!ts) return ''
  if (Date.now() - ts < 60 * 1000) return '刚刚'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* 今天 / 昨天 / 更早 */
function dayTag(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = (s - t) / 86400000
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return '更早'
}

/* 状态栏高度（导航胶囊 padding-top 用） */
const SBH = (() => { try { const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); return i.statusBarHeight || 20 } catch (e) { return 20 } })()

Page({
  data: {
    statusBarHeight: SBH,
    showBack: true,
    list: [],        // 互动记录 [{emoji,label,ts,time}]
    pressing: false, // 大按钮按压态
    hearts: []      // 飘心动画元素 [{id,emoji,size,left,dx,dy,rot,dur}]
  },

  onShow() {
    /* 官方标准：页面显示时把 tabBar 选中态同步到本页 */
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.refresh()
  },

  /* 头部胶囊流动烟雾 */
  onReady() {
    this._flux = flux.initFlux(this, FLUX_THEME)
  },

  onUnload() {
    if (this._flux && this._flux.stop) this._flux.stop()
    this._flux = null
  },

  refresh() {
    const saved = wx.getStorageSync(STORAGE_KEY) || []
    const list = (Array.isArray(saved) ? saved : []).map(r => ({
      ...r,
      time: formatTime(r.ts),
      dayTag: dayTag(r.ts)
    }))
    this.setData({ list })
  },

  /* ===== 记录互动 ===== */
  addRecord(emoji, label) {
    const ts = Date.now()
    const record = { emoji, label, ts, time: '刚刚' }
    const saved = wx.getStorageSync(STORAGE_KEY) || []
    const next = [record, ...(Array.isArray(saved) ? saved : [])].slice(0, MAX_RECORDS)
    wx.setStorageSync(STORAGE_KEY, next)
    this.refresh()
    wx.showToast({ title: `${label} ${emoji}`, icon: 'none' })
  },

  /* 想你了💗大按钮：记录 + 飘心动画 */
  tapMiss() {
    this.setData({ pressing: true })
    setTimeout(() => this.setData({ pressing: false }), 180)
    this.burstHearts()
    this.addRecord('💗', '想你了')
  },

  tapMorning() {
    this.addRecord('☀️', '早安')
  },

  tapNight() {
    this.addRecord('🌙', '晚安')
  },

  /* ===== 飘心动画：一批爱心 view 上飘渐隐 =====
     用 CSS @keyframes + 动态参数（dx/dy/rot/dur）实现每个爱心不同轨迹 */
  burstHearts() {
    const batch = []
    const count = 8
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1)
      const angle = (t - 0.5) * 1.4                    // 扇形 -0.7~0.7 rad
      const dist = 300 + Math.random() * 120
      batch.push({
        id: ++heartSeq,
        emoji: HEART_POOL[i % HEART_POOL.length],
        size: 36 + Math.floor(Math.random() * 28),
        left: 330 + Math.floor(Math.random() * 60),    // 按钮中心附近
        top: 430 + Math.floor(Math.random() * 60),
        dx: Math.round(Math.sin(angle) * dist),
        dy: Math.round(-Math.cos(angle) * dist),
        rot: Math.round((Math.random() - 0.5) * 60),
        dur: (1.0 + Math.random() * 0.4).toFixed(2)
      })
    }
    this.setData({ hearts: this.data.hearts.concat(batch) })

    /* 动画结束后移除节点，避免节点无限累积 */
    setTimeout(() => {
      const ids = {}
      batch.forEach(h => { ids[h.id] = true })
      this.setData({
        hearts: this.data.hearts.filter(h => !ids[h.id])
      })
    }, 1400)
  }
})
