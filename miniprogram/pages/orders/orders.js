const app = getApp()
const flux = require('../../utils/flux.js')

/* 订单页烟雾主题：薄荷青绿 */
const FLUX_THEME = {
  c1: [0.45, 0.95, 0.85],
  c2: [0.25, 0.72, 0.92],
  c3: [0.10, 0.45, 0.85],
  seed: 1.3
}

/* ===== 订单状态（颜色与任务规范 / preview.html 严格一致）===== */
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

/* —— 本地购物车工具（app.globalData.cart，结构 { [dishId]: {dish, count} }）—— */
function cartEntries() {
  const cart = app.globalData.cart || {}
  return Object.keys(cart).map(k => cart[k]).filter(i => i && i.dish && i.dish._id)
}

/* 状态栏高度（导航胶囊 padding-top 用） */
const SBH = (() => { try { const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); return i.statusBarHeight || 20 } catch (e) { return 20 } })()

Page({
  data: {
    statusBarHeight: SBH,
    showBack: true,
    /* 今晚这单 */
    cartList: [],   // [{dishId,name,emoji,price,count,sum}]
    cartCount: 0,
    cartTotal: 0,
    remark: '',
    submitting: false,
    /* 历史订单 */
    orders: [],
    loading: true,
    /* 副标题 */
    subText: '点餐记录都在这里'
  },

  onShow() {
    this.refreshCart()
    this.loadOrders()
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
    this.loadOrders(() => wx.stopPullDownRefresh())
  },

  /* ========== 今晚这单 ========== */

  refreshCart() {
    const list = cartEntries().map(i => ({
      dishId: i.dish._id,
      name: i.dish.name,
      emoji: i.dish.emoji,
      price: i.dish.price,
      count: i.count,
      sum: i.dish.price * i.count
    }))
    const count = list.reduce((s, i) => s + i.count, 0)
    const total = list.reduce((s, i) => s + i.sum, 0)
    this.setData({ cartList: list, cartCount: count, cartTotal: total })
    this.updateSub()
  },

  incCount(e) {
    const id = e.currentTarget.dataset.id
    const item = app.globalData.cart[id]
    if (!item) return
    item.count++
    wx.setStorageSync('cart', app.globalData.cart)
    this.refreshCart()
  },

  decCount(e) {
    const id = e.currentTarget.dataset.id
    const item = app.globalData.cart[id]
    if (!item) return
    item.count--
    if (item.count <= 0) delete app.globalData.cart[id]
    wx.setStorageSync('cart', app.globalData.cart)
    this.refreshCart()
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  async submitOrder() {
    if (this.data.submitting) return
    const items = this.data.cartList.map(({ dishId, name, emoji, price, count }) => ({ dishId, name, emoji, price, count }))
    if (!items.length) {
      wx.showToast({ title: '订单是空的', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '下单中…', mask: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: { items, remark: this.data.remark }
      })
      wx.hideLoading()

      /* 下单成功：清空购物车（内存 + 本地存储） */
      app.globalData.cart = {}
      wx.removeStorageSync('cart')
      this.setData({ submitting: false, remark: '' })
      this.refreshCart()
      wx.showToast({ title: '下单成功', icon: 'none' })
      console.log('[createOrder] orderNo =', res.result && res.result.orderNo)

      this.loadOrders()
    } catch (e) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: (e && (e.errMsg || e.message)) || '下单失败，再试一次', icon: 'none' })
    }
  },

  /* ========== 历史订单 ========== */

  async loadOrders(done) {
    try {
      const res = await wx.cloud.callFunction({ name: 'getOrders', data: {} })
      const list = ((res.result && res.result.list) || []).map(o => this.decorate(o))
      this.setData({ orders: list, loading: false })
      this.updateSub()
    } catch (e) {
      console.error('getOrders 失败', e)
      this.setData({ loading: false })
      wx.showToast({ title: '订单加载失败', icon: 'none' })
    }
    if (done) done()
  },

  /* 组装展示字段：状态标签 / 菜品摘要 / 时间 / 可用操作 */
  decorate(order) {
    const st = ORDER_STATUS[order.status] || { text: order.status, emoji: '❓', color: '#8A817A', bg: '#F0EAE2' }
    const items = order.items || []
    const names = items.map(i => `${i.emoji || ''}${i.name}×${i.count}`)
    const summary = names.length > 3
      ? names.slice(0, 3).join('、') + ` 等${items.length}件`
      : names.join('、')

    const actions = []
    if (order.status === 'pending') {
      actions.push({ value: 'cancel', label: '取消' })
    } else if (order.status === 'cooking') {
      actions.push({ value: 'poke', label: order.pokeCount ? `催单💗×${order.pokeCount}` : '催单💗' })
    }

    return {
      ...order,
      statusText: `${st.emoji} ${st.text}`,
      statusColor: st.color,
      statusBg: st.bg,
      summary,
      remark: order.remark || '',
      timeText: formatTime(order.createdAt),
      actions
    }
  },

  async onAction(e) {
    const { id, action } = e.currentTarget.dataset
    if (!id || !action) return

    /* 取消订单需要二次确认 */
    if (action === 'cancel') {
      const res = await wx.showModal({
        title: '取消订单',
        content: '确定不要这一单了吗？',
        confirmText: '取消订单',
        confirmColor: '#007AFF'
      })
      if (!res.confirm) return
    }

    wx.showLoading({ title: '处理中…', mask: true })
    try {
      await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: { orderId: id, action }
      })
      wx.hideLoading()
      const tip = action === 'cancel' ? '订单已取消' : '已经催宝贝啦 💗'
      wx.showToast({ title: tip, icon: 'none' })
      this.loadOrders()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: (err && (err.errMsg || err.message)) || '操作失败', icon: 'none' })
      this.loadOrders()
    }
  },

  /* ========== 副标题 ========== */

  updateSub() {
    let sub = '点餐记录都在这里'
    if (this.data.cartCount > 0) {
      sub = `已点 ${this.data.cartCount} 道，还没下单`
    } else if (this.data.orders.length) {
      sub = `${this.data.orders.length} 条历史订单`
    }
    this.setData({ subText: sub })
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