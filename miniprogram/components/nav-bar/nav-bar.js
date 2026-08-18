Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false }
  },
  data: {
    statusBarHeight: 20,
    totalHeight: 64
  },
  lifetimes: {
    attached() {
      let info = {}
      try {
        info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      } catch (e) {}
      const sbh = info.statusBarHeight || 20
      this.setData({ statusBarHeight: sbh, totalHeight: sbh + 44 })
    }
  },
  methods: {
    onBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.reLaunch({ url: '/pages/index/index' })
      }
    }
  }
})
