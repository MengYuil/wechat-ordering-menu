const app = getApp()
const flux = require('../../utils/flux.js')

/* 按时段问候（Apple 式动态问候语）*/
function greeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/* 本地兜底菜单（云数据为空/连不上时用）*/
const FALLBACK_MENU = [
  { _id: 'd1', name: '番茄炒蛋面', emoji: '🍜', price: 18, category: '主食', desc: '酸甜开胃，暖胃又暖心' },
  { _id: 'd2', name: '可乐鸡翅饭', emoji: '🍗', price: 22, category: '主食', desc: '甜甜的可乐裹着嫩鸡翅' },
  { _id: 'd3', name: '红烧肉配饭', emoji: '🥘', price: 28, category: '主食', desc: '肥而不腻，入口即化' },
  { _id: 'd4', name: '虾仁滑蛋饭', emoji: '🍤', price: 26, category: '主食', desc: '滑嫩鸡蛋遇上弹弹虾仁' },
  { _id: 'd5', name: '草莓小蛋糕', emoji: '🍰', price: 15, category: '甜品', desc: '软fufu，甜到心里' },
  { _id: 'd6', name: '红豆双皮奶', emoji: '🥛', price: 12, category: '甜品', desc: '奶香浓郁，红豆绵密' },
  { _id: 'd7', name: '蜂蜜柚子茶', emoji: '🍯', price: 10, category: '饮品', desc: '清新润喉，暖暖的' },
  { _id: 'd8', name: '珍珠奶茶', emoji: '🧋', price: 12, category: '饮品', desc: '波霸多多，快乐加倍' },
  { _id: 'd9', name: '热巧克力', emoji: '☕', price: 14, category: '饮品', desc: '浓郁丝滑，治愈系' },
  { _id: 'd10', name: '香辣烤串', emoji: '🍢', price: 20, category: '夜宵', desc: '滋滋冒油，小心烫嘴' },
  { _id: 'd11', name: '蒜蓉小龙虾', emoji: '🦞', price: 45, category: '夜宵', desc: '红彤彤的一大盘' },
  { _id: 'd12', name: '黄金炸鸡', emoji: '🍗', price: 25, category: '夜宵', desc: '外酥里嫩，一口爆汁' }
]

/* —— 本地购物车：app.globalData.cart + wx.storage 持久化 ——
   逻辑参照 dcapp/miniprogram/utils/cart.js（本页内联实现） */
function cartAdd(dish, count = 1) {
  const cart = app.globalData.cart
  if (cart[dish._id]) {
    cart[dish._id].count += count
  } else {
    cart[dish._id] = { dish, count }
  }
  wx.setStorageSync('cart', cart)
}

function cartClear() {
  app.globalData.cart = {}
  wx.removeStorageSync('cart')
}

function cartCount() {
  return Object.values(app.globalData.cart).reduce((s, i) => s + i.count, 0)
}

function cartTotal() {
  return Object.values(app.globalData.cart).reduce((s, i) => s + i.count * i.dish.price, 0)
}

/* 结算明细（sum = 单项小计，供抽屉展示） */
function cartList() {
  return Object.values(app.globalData.cart).map(i => ({
    dishId: i.dish._id,
    name: i.dish.name,
    emoji: i.dish.emoji,
    price: i.dish.price,
    count: i.count,
    sum: i.dish.price * i.count
  }))
}

/* 状态栏高度（导航胶囊 padding-top 用） */
const SBH = (() => { try { const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync(); return i.statusBarHeight || 20 } catch (e) { return 20 } })()

Page({
  data: {
    statusBarHeight: SBH,
    showBack: true,
    greeting: greeting(),
    dishTotal: 0,
    /* 顶层字段的文本绑定（{{greeting}}）在本工具渲染为空，但 wx:for 集合 + 循环项 {{item}} 正常。
       所有需要动态文本的位置都用单元素数组 + wx:for 绕开 */
    uiGreet: [''],
    uiSub: [''],
    uiBadge: [''],
    uiCartLine: [''],
    uiTotalLine: [''],
    uiSheetTotal: [''],
    uiError: [''],
    dishes: [],
    categories: ['全部'],
    activeCat: '全部',
    activeIndex: 0,
    listAnim: '',
    filtered: [],
    loading: true,
    errorMsg: '',
    cartCount: 0,
    cartTotal: 0,
    badgeBounce: false,
    /* 点单动画：白球飞向购物车 */
    flyShow: false,
    flyStart: { x: 0, y: 0 },
    flyDx: 0,
    flyDy: 0,
    flyTrigger: false,
    isAdmin: false,
    /* 支付抽屉 */
    payShow: false,
    payList: [],
    remark: '',
    submitting: false
  },

  onLoad() {
    this.setData({
      uiGreet: [`${this.data.greeting}，MengYu`],
      uiSub: ['共 0 道 · 今天也慢慢吃']
    })
    this.loadMenu()
  },

  /* 初始化头部胶囊的 WebGL 流动烟雾 */
  onReady() {
    this.initFlux()
  },

  initFlux() {
    const q = wx.createSelectorQuery()
    q.select('#nb-flux').fields({ node: true, size: true })
    q.exec((res) => {
      if (!res || !res[0] || !res[0].node) {
        console.warn('flux canvas 未找到，跳过烟雾背景')
        return
      }
      const { node, width, height } = res[0]
      const renderer = flux.makeFlux(node)
      if (!renderer) {
        console.warn('flux webgl 初始化失败，降级为无背景')
        return
      }
      this._flux = renderer
      this._fluxW = width
      this._fluxH = height
      if (typeof this._fluxRaf === 'undefined') {
        this._fluxRaf = true
        this._fluxLoop()
      }
    })
  },

  /* rAF 渲染循环（固定流速，静止流动） */
  _fluxLoop() {
    if (!this._flux) return
    flux.render(this._flux, this._fluxW, this._fluxH)  // 内部已 try/catch，不会中断
    this._fluxTimer = setTimeout(() => this._fluxLoop(), 33)  // ~30fps，省电
  },

  /* 页面卸载时停止渲染 */
  onUnload() {
    if (this._fluxTimer) { clearTimeout(this._fluxTimer); this._fluxTimer = null }
    this._flux = null
  },

  onShow() {
    /* 官方标准：页面显示时把 tabBar 选中态同步到本页（tabBar 每页独立实例）*/
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.setData({ isAdmin: app.globalData.role === 'admin' })
    this.refreshCart()
  },

  onPullDownRefresh() {
    this.loadMenu(() => wx.stopPullDownRefresh())
  },

  async loadMenu(done) {
    let list = []
    try {
      const res = await wx.cloud.callFunction({ name: 'getMenu' })
      list = (res.result && res.result.list) || []
    } catch (e) {
      console.error('getMenu 失败，使用本地兜底', e)
    }
    /* 云数据为空时用本地兜底，保证菜品始终可见 */
    if (!list.length) {
      list = FALLBACK_MENU
    }
    const cats = ['全部', ...new Set(list.map(d => d.category))]
    this.setData({
      dishes: list,
      dishTotal: list.length,
      categories: cats,
      filtered: this.data.activeCat === '全部'
        ? list
        : list.filter(d => d.category === this.data.activeCat),
      uiSub: [`共 ${list.length} 道 · 今天也慢慢吃`],
      loading: false,
      errorMsg: ''
    })
    if (done) done()
  },

  onCat(e) {
    const cat = e.currentTarget.dataset.cat
    if (cat === this.data.activeCat) return
    const idx = this.data.categories.indexOf(cat)
    const filtered = cat === '全部'
      ? this.data.dishes
      : this.data.dishes.filter(d => d.category === cat)
    this.setData({ activeCat: cat, activeIndex: idx, filtered, listAnim: '' })
    setTimeout(() => this.setData({ listAnim: 'enter' }), 20)
  },

  /* 点整张卡片或粉色加号 → 加入本地购物车 + 白球飞入动画 */
  addToCart(e) {
    const dish = e.currentTarget.dataset.dish
    const idx = e.currentTarget.dataset.idx
    if (!dish || !dish._id) return
    cartAdd(dish)
    this.refreshCart(true)
    this.flyToCart(idx)
  },

  /* 白球从加号位置飞向底部购物车（抛物线） */
  flyToCart(idx) {
    const q = wx.createSelectorQuery()
    // 起点：点中的加号
    q.select('#add-' + idx).boundingClientRect()
    // 终点：底部结算条（购物车所在）
    q.select('.settle-bar').boundingClientRect()
    q.exec((res) => {
      const from = res && res[0]
      const to = res && res[1]
      if (!from) return
      // 起点=加号中心
      const sx = from.left + from.width / 2
      const sy = from.top + from.height / 2
      let ex, ey
      if (to) {
        // 终点=结算条左侧购物车图标附近
        ex = to.left + 70
        ey = to.top + to.height / 2
      } else {
        // 无结算条（第一道菜）：往右上角订单徽标方向飞
        ex = from.left + from.width
        ey = from.top - 80
      }
      const start = { x: sx, y: sy }
      this.setData({
        flyShow: true,
        flyStart: start,
        flyDx: ex - sx,
        flyDy: ey - sy
      })
      // 下一帧加 class 触发 CSS transition 抛物线
      wx.nextTick(() => {
        this.setData({ flyTrigger: true })
        // 动画结束后隐藏
        setTimeout(() => {
          this.setData({ flyShow: false, flyTrigger: false })
        }, 680)
      })
    })
  },

  refreshCart(bounce) {
    const n = cartCount(), t = cartTotal()
    this.setData({
      cartCount: n,
      cartTotal: t,
      uiBadge: [`${n}`],
      uiCartLine: [`共 ${n} 道`],
      uiTotalLine: [`¥${t}`]
    })
    if (bounce) {
      this.setData({ badgeBounce: false })
      setTimeout(() => this.setData({ badgeBounce: true }), 30)
      setTimeout(() => this.setData({ badgeBounce: false }), 460)
    }
  },

  /* —— 一键下单抽屉 —— */
  openPay() {
    if (!cartCount()) {
      wx.showToast({ title: '订单是空的', icon: 'none' })
      return
    }
    this.setData({ payShow: true, payList: cartList(), uiSheetTotal: [`¥${cartTotal()}`] })
    this.setTabBarHidden(true)
  },

  closePay() {
    if (this.data.submitting) return
    this.setData({ payShow: false })
    this.setTabBarHidden(false)
  },

  setTabBarHidden(hidden) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden })
    }
  },

  noop() {},

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  async confirmPay() {
    if (this.data.submitting) return
    const items = cartList().map(({ dishId, name, emoji, price, count }) => ({ dishId, name, emoji, price, count }))
    if (!items.length) {
      wx.showToast({ title: '订单是空的', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '正在支付…', mask: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: { items, remark: this.data.remark }
      })
      wx.hideLoading()

      /* 下单成功：清空购物车并持久化移除 */
      cartClear()
      this.setData({ submitting: false, payShow: false, remark: '' })
      this.setTabBarHidden(false)
      this.refreshCart()
      wx.showToast({ title: '下单成功', icon: 'none' })
      console.log('[createOrder] orderNo =', res.result && res.result.orderNo)
    } catch (e) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: (e && (e.errMsg || e.message)) || '下单失败，再试一次', icon: 'none' })
    }
  },

  /* —— 右上角入口（页面后续任务补齐，先兜底提示） —— */
  goWishlist() {
    wx.navigateTo({
      url: '/pages/wishlist/wishlist',
      fail: () => wx.showToast({ title: '心愿单马上就来～', icon: 'none' })
    })
  },

  goOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders',
      fail: () => wx.showToast({ title: '订单页马上就来～', icon: 'none' })
    })
  },

  goAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin',
      fail: () => wx.showToast({ title: '管家面板马上就来～', icon: 'none' })
    })
  }
})
