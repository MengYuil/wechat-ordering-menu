const { TEMPLATE_ID } = require('./config.js')

App({
  globalData: {
    openid: '',
    role: '',
    cart: {},
    supportBlur: true,
    TEMPLATE_ID
  },

  onLaunch() {
    // 恢复本地购物车（storage 持久化）
    const savedCart = wx.getStorageSync('cart')
    this.globalData.cart = savedCart && typeof savedCart === 'object' ? savedCart : {}

    // 检测 backdrop-filter 支持（毛玻璃能力）
    // iOS 全支持；Android 需 XWeb/Skyline 引擎（基础库 2.17.0+）；不支持则降级纯半透明+阴影
    this.globalData.supportBlur = this.detectBackdropFilter()

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({ env: 'your-cloud-env-id', traceUser: true })
    }

    this.login()
  },

  /* 运行时检测 backdrop-filter 支持 */
  detectBackdropFilter() {
    try {
      const info = wx.getSystemInfoSync()
      if (info.platform === 'ios' || info.platform === 'devtools') return true
      if (info.platform === 'android') {
        // Android：XWeb 引擎（基础库 2.17.0+）支持 backdrop-filter，旧内核降级
        const v = (info.SDKVersion || '').split('.').map(Number)
        return (v[0] > 2) || (v[0] === 2 && v[1] >= 17)
      }
      return true
    } catch (e) {
      return false
    }
  },

  // 登录：调 login 云函数拿 openid + role 存进 globalData
  async login() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      this.globalData.openid = (res.result && res.result.openid) || ''
      this.globalData.role = (res.result && res.result.role) || ''
      console.log('[login]', this.globalData.openid, this.globalData.role)
    } catch (e) {
      console.error('login 云函数调用失败', e)
    }
  }
})
