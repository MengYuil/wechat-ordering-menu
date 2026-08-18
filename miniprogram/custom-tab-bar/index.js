Component({
  data: {
    selected: 0,      // 当前选中 tab
    hidden: false,    // 是否隐藏（支付抽屉等场景）
    preview: -1,      // 触摸预览的 tab（按压/滑动时高亮跟随）
    dragging: false,  // 拖动中：胶囊 transition 关闭，跟手瞬移
    capStyle: '',     // 滑动胶囊的内联样式（宽度 + transform）
    capScale: 1.03,   // 胶囊缩放：选中 1.03 / 按压 1.18
    list: [
      { pagePath: '/pages/index/index', text: '菜单', cls: 'ico-menu' },
      { pagePath: '/pages/mood/mood', text: '心情', cls: 'ico-mood' },
      { pagePath: '/pages/companion/companion', text: '陪伴', cls: 'ico-companion' }
    ]
  },

  /* selected 变化时滑动胶囊跟随（页面 onShow 直接 setData selected 也生效）*/
  observers: {
    'selected': function (val) {
      this.updateCap(val)
    }
  },

  lifetimes: {
    attached() {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      this._width = info.windowWidth || 375
      const px = (rpx) => rpx * (this._width / 750)
      // 悬浮胶囊左边距 24rpx、bar 内边距 8rpx（与 tab margin 同宽，左右空隙均匀）、tab margin 8rpx
      this._barLeft = px(24)
      this._barInPad = px(8)
      this._tabMargin = px(8)
      const barW = this._width - this._barLeft * 2
      this._slotW = (barW - this._barInPad * 2) / this.data.list.length
      this._capW = this._slotW - this._tabMargin * 2
      this.updateCap(this.data.selected)
    }
  },

  methods: {
    /* 计算选中胶囊的位置（切换时 transition 滑动）
       胶囊是 .tabbar 的绝对子元素（left:0），坐标从 bar 内边距算起，不加 _barLeft */
    updateCap(index) {
      if (typeof this._slotW !== 'number' || isNaN(this._slotW)) return
      const left = this._barInPad + index * this._slotW + this._tabMargin
      const s = this.data.capScale
      this.setData({
        capStyle: 'width:' + this._capW + 'px;transform:translateX(' + left +
          'px) translateY(-50%) scale(' + s + ');'
      })
    },

    /* 拖动跟手：胶囊中心跟随手指 x，限制在 bar 内（无 transition 瞬移）*/
    moveCapToX(x) {
      const minX = this._barInPad + this._tabMargin
      const maxX = this._barInPad + (this.data.list.length - 1) * this._slotW + this._tabMargin
      let capX = x - this._barLeft - this._barInPad - this._capW / 2
      capX = Math.max(minX, Math.min(maxX, capX))
      const s = this.data.capScale
      this.setData({
        capStyle: 'width:' + this._capW + 'px;transform:translateX(' + capX +
          'px) translateY(-50%) scale(' + s + ');'
      })
    },

    /* 点击切换（tap 兜底）*/
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      const idx = Number(index)
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx })  // observer → 胶囊立即滑过去
        wx.switchTab({ url: path })
      }
    },

    /* 根据 x 坐标算出所在 tab 的 index（考虑胶囊左边距）*/
    indexFromX(x) {
      const n = this.data.list.length
      const idx = Math.floor((x - this._barLeft - this._barInPad) / this._slotW)
      return Math.max(0, Math.min(n - 1, idx))
    },

    /* 触摸开始：记录起点 + 胶囊/图标一起放大（胶囊留在原位，点击时才能看到滑动动画）*/
    onTouchStart(e) {
      const t = e.touches[0]
      this._startX = t.clientX
      this._moved = false
      const idx = this.indexFromX(t.clientX)
      this.setData({ preview: idx, capScale: 1.18, dragging: true })
      this.updateCap(this.data.selected)  // 原位放大，不瞬移
    },

    /* 触摸移动：胶囊实时跟手 + 预览跟随 */
    onTouchMove(e) {
      const x = e.touches[0].clientX
      if (Math.abs(x - this._startX) > 12) this._moved = true
      const idx = this.indexFromX(x)
      if (idx !== this.data.preview) this.setData({ preview: idx })
      if (this._moved) this.moveCapToX(x)
    },

    /* 触摸结束：恢复 transition；拖动则吸附到最近 tab，点击则直接选中 + 切页 */
    onTouchEnd() {
      const idx = this.data.preview
      this.setData({ preview: -1, capScale: 1.03, dragging: false })
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx })   // 胶囊滑到目标位
        wx.switchTab({ url: this.data.list[idx].pagePath })  // 拖动/点击都切页
      } else {
        this.updateCap(this.data.selected) // 原位回弹
      }
    }
  }
})