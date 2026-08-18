const flux = require('../../utils/flux.js')

/* 心情页烟雾主题：桃红珊瑚 */
const FLUX_THEME = {
  c1: [1.00, 0.62, 0.75],
  c2: [1.00, 0.42, 0.55],
  c3: [0.95, 0.20, 0.45],
  seed: 3.5
}

const MOODS = [
  { emoji: '😄', label: '开心' },
  { emoji: '😌', label: '平静' },
  { emoji: '🥰', label: '想你' },
  { emoji: '😢', label: '难过' },
  { emoji: '😠', label: '生气' },
  { emoji: '😴', label: '疲惫' }
]

const STORAGE_KEY = 'moods'
const MAX_RECORDS = 100
let particleSeq = 0

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

/* 本周小结：次数 / 最高频心情 / 以「想你」收尾的晚上数 */
function weekSummary(list) {
  if (!list.length) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
  const week = list.filter(r => r.ts >= start)
  if (!week.length) return null
  const freq = {}
  week.forEach(r => { freq[r.label] = (freq[r.label] || 0) + 1 })
  let top = '', topN = 0
  for (const k in freq) {
    if (freq[k] > topN) { topN = freq[k]; top = k }
  }
  const byDay = {}
  week.forEach(r => {
    const d = new Date(r.ts)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!byDay[key] || r.ts > byDay[key].ts) byDay[key] = r
  })
  const missNights = Object.values(byDay).filter(r => r.label === '想你').length
  return { count: week.length, top, missNights }
}

/* 状态栏高度（导航胶囊 padding-top 用） */
const SBH = (() => { try { const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); return i.statusBarHeight || 20 } catch (e) { return 20 } })()

Page({
  data: {
    statusBarHeight: SBH,
    showBack: true,
    moods: MOODS,   // 顶部情绪网格
    list: [],       // 时间线记录 [{emoji,label,ts,time}]
    summary: null,  // 本周小结
    particles: []   // 大粒子动画元素
  },

  onShow() {
    /* 官方标准：页面显示时把 tabBar 选中态同步到本页 */
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
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

  /* 从本地存储读取记录，并把「刚刚」按需刷新成具体时间 */
  refresh() {
    const saved = wx.getStorageSync(STORAGE_KEY) || []
    const list = (Array.isArray(saved) ? saved : []).map(r => ({
      ...r,
      time: formatTime(r.ts),
      dayTag: dayTag(r.ts)
    }))
    this.setData({ list, summary: weekSummary(list) })
  },

  /* 点一下记录此刻的心情 */
  tapMood(e) {
    const { emoji, label } = e.currentTarget.dataset
    if (!emoji || !label) return

    const ts = Date.now()
    const record = { emoji, label, ts, time: '刚刚' }
    const saved = wx.getStorageSync(STORAGE_KEY) || []
    const next = [record, ...(Array.isArray(saved) ? saved : [])].slice(0, MAX_RECORDS)
    wx.setStorageSync(STORAGE_KEY, next)

    this.refresh()
    this.burstBig(emoji)
  },

  /* ===== 大粒子动画：不规则飘散的大 emoji ===== */
  burstBig(emoji) {
    const batch = []
    for (let i = 0; i < 1; i++) {
      batch.push({
        id: ++particleSeq,
        emoji,
        size: 180 + Math.floor(Math.random() * 80),
        left: 80 + Math.floor(Math.random() * 440),
        top: 200 + Math.floor(Math.random() * 400),
        dx: Math.floor((Math.random() - 0.5) * 480),
        dy: -(150 + Math.floor(Math.random() * 350)),
        rot: Math.floor((Math.random() - 0.5) * 360),
        dur: (0.9 + Math.random() * 0.7).toFixed(2)
      })
    }
    this.setData({ particles: this.data.particles.concat(batch) })
    setTimeout(() => {
      const ids = {}
      batch.forEach(p => { ids[p.id] = true })
      this.setData({ particles: this.data.particles.filter(p => !ids[p.id]) })
    }, 1700)
  }
})
