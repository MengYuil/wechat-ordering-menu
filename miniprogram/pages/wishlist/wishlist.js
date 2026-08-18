const app = getApp()
const flux = require('../../utils/flux.js')

/* 心愿单页烟雾主题：金黄暖橙 */
const FLUX_THEME = {
  c1: [1.00, 0.85, 0.35],
  c2: [1.00, 0.62, 0.25],
  c3: [0.95, 0.38, 0.10],
  seed: 2.5
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatTime(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/* 状态栏高度（导航胶囊 padding-top 用） */
const SBH = (() => { try { const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); return i.statusBarHeight || 20 } catch (e) { return 20 } })()

Page({
  data: {
    statusBarHeight: SBH,
    showBack: true,
    input: '',
    list: [],
    isAdmin: false,
    loading: true
  },

  onShow() {
    /* 管理员（专属管家）可帮实现心愿；login 可能为异步，兜底延时重读一次 */
    this.setData({ isAdmin: app.globalData.role === 'admin' })
    if (!app.globalData.role) {
      setTimeout(() => this.setData({ isAdmin: app.globalData.role === 'admin' }), 1500)
    }
    this.load()
  },

  /* 头部胶囊流动烟雾 */
  onReady() {
    this._flux = flux.initFlux(this, FLUX_THEME)
  },

  onUnload() {
    if (this._flux && this._flux.stop) this._flux.stop()
    this._flux = null
  },

  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  /* ===== 列表 ===== */
  async load(done) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'wishlist',
        data: { action: 'list' }
      })
      const list = ((res.result && res.result.list) || []).map(w => ({
        ...w,
        timeText: formatTime(w.createdAt),
        granted: w.status === 'granted'
      }))
      this.setData({ list, loading: false })
    } catch (e) {
      console.error('wishlist list 失败', e)
      this.setData({ loading: false })
      wx.showToast({ title: '心愿加载失败', icon: 'none' })
    }
    if (done) done()
  },

  /* ===== 添加心愿 ===== */
  async add() {
    const content = this.data.input.trim()
    if (!content) {
      wx.showToast({ title: '写点啥吧', icon: 'none' })
      return
    }
    try {
      await wx.cloud.callFunction({
        name: 'wishlist',
        data: { action: 'add', content }
      })
      this.setData({ input: '' })
      wx.showToast({ title: '记下了', icon: 'none' })
      this.load()
    } catch (e) {
      wx.showToast({ title: (e && (e.errMsg || e.message)) || '添加失败', icon: 'none' })
    }
  },

  /* ===== 删除心愿 ===== */
  async remove(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '删除心愿',
      content: '确定要删掉这个心愿吗？',
      confirmText: '删除',
      confirmColor: '#007AFF'
    })
    if (!res.confirm) return
    try {
      await wx.cloud.callFunction({
        name: 'wishlist',
        data: { action: 'remove', wishId: id }
      })
      wx.showToast({ title: '已删除', icon: 'none' })
      this.load()
    } catch (err) {
      wx.showToast({ title: (err && (err.errMsg || err.message)) || '删除失败', icon: 'none' })
    }
  },

  /* ===== 管理员实现心愿 ===== */
  async grant(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '实现中…', mask: true })
    try {
      await wx.cloud.callFunction({
        name: 'wishlist',
        data: { action: 'grant', wishId: id }
      })
      wx.hideLoading()
      wx.showToast({ title: '实现了', icon: 'none' })
      this.load()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: (err && (err.errMsg || err.message)) || '操作失败', icon: 'none' })
    }
  },

  /* 返回上一页 */
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})