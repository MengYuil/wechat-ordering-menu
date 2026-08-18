const app = getApp()
const flux = require('../../utils/flux.js')

/* 管家页烟雾主题：烟熏灰紫 */
const FLUX_THEME = {
  c1: [0.85, 0.82, 0.95],
  c2: [0.68, 0.62, 0.88],
  c3: [0.48, 0.40, 0.75],
  seed: 5.5
}

/* ===== 订单状态（颜色与 orders 页严格一致）===== */
const ORDER_STATUS = {
  pending:   { text: '待接单', emoji: '⏳', color: '#FF9F0A', bg: 'rgba(255,159,10,0.22)' },
  cooking:   { text: '制作中', emoji: '🍳', color: '#0A84FF', bg: 'rgba(10,132,255,0.22)' },
  done:      { text: '已完成', emoji: '✅', color: '#30D158', bg: 'rgba(48,209,88,0.20)' },
  cancelled: { text: '已取消', emoji: '🚫', color: '#A1A1AA', bg: 'rgba(161,161,170,0.22)' }
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
    isAdmin: false,
    checking: true,     // role 是否已就绪
    orders: [],         // 只保留 pending / cooking
    loading: true,
    subText: '看看宝贝点了什么，快去接单吧'
  },

  onShow() {
    this.checkRole()
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
    if (this.data.isAdmin) {
      this.loadOrders(() => wx.stopPullDownRefresh())
    } else {
      wx.stopPullDownRefresh()
    }
  },

  /* ===== 角色校验（参照 wishlist 页：globalData 未就绪时 1.5s 兜底重读）===== */
  checkRole() {
    const judge = () => {
      const ok = app.globalData.role === 'admin'
      this.setData({ isAdmin: ok, checking: false })
      if (ok) {
        this.loadOrders()
      } else {
        this.setData({ loading: false })
      }
    }

    if (app.globalData.role) {
      judge()
    } else {
      /* login 尚未返回：1.5s 后兜底重读一次 */
      setTimeout(() => {
        if (app.globalData.role) {
          judge()
        } else {
          this.setData({ isAdmin: false, checking: false, loading: false })
        }
      }, 1500)
    }
  },

  /* ===== 拉取订单（admin 看全部，只显示待接单/制作中）===== */
  async loadOrders(done) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: { status: ['pending', 'cooking'], limit: 50 }
      })
      const list = ((res.result && res.result.list) || []).map(o => this.decorate(o))
      list.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1))
      this.setData({ orders: list, loading: false })
      this.updateSub()
    } catch (e) {
      console.error('getOrders 失败', e)
      this.setData({ loading: false })
      wx.showToast({ title: '订单加载失败', icon: 'none' })
    }
    if (done) done()
  },

  /* 组装展示字段 */
  decorate(order) {
    const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending
    const items = order.items || []
    const names = items.map(i => `${i.emoji || ''}${i.name}×${i.count}`)
    const summary = names.length > 3
      ? names.slice(0, 3).join('、') + ` 等${items.length}件`
      : names.join('、')

    return {
      ...order,
      statusText: `${st.emoji} ${st.text}`,
      statusColor: st.color,
      statusBg: st.bg,
      summary,
      remark: order.remark || '',
      total: order.total != null ? order.total : items.reduce((s, i) => s + (i.price || 0) * (i.count || 0), 0),
      timeText: formatTime(order.createdAt),
      action: order.status === 'pending'
        ? { value: 'accept', label: '接单' }
        : { value: 'done', label: '完成✅' }
    }
  },

  /* ===== 接单 / 完成 ===== */
  async onAction(e) {
    const { id, action } = e.currentTarget.dataset
    if (!id || !action) return

    wx.showLoading({ title: '处理中…', mask: true })
    try {
      await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: { orderId: id, action }
      })
      wx.hideLoading()
      wx.showToast({ title: action === 'accept' ? '已接单，开始做吧 🍳' : '完成啦 ✅', icon: 'none' })
      this.loadOrders()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: (err && (err.errMsg || err.message)) || '操作失败', icon: 'none' })
      this.loadOrders()
    }
  },

  goBack() {
    /* app 未配置 tabBar：优先返回上一页，无上一页则重进首页 */
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  updateSub() {
    const n = this.data.orders.length
    this.setData({ subText: n ? `${n} 单待处理，加油 💪` : '看看宝贝点了什么，快去接单吧' })
  }
})
