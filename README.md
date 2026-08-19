# WeChat Ordering Menu · 微信点餐

给 TA 点餐 + 情侣日常工具：她点菜你接单，还有心愿单、心情打卡、陪伴互动。

**技术栈**：微信小程序 + 微信云开发（免费额度，单用户/情侣够用）。

## 功能

- 点餐下单：分类菜单、加菜动画、结算附言、确认支付
- 订单：当前单 + 历史，可取消 / 催单
- 心愿单：记心愿，管家可帮「实现」
- 心情打卡：6 种心情 + 本周小结
- 陪伴互动：想念 / 早安 / 晚安
- 管家：接单、完成
- 液态玻璃 UI，白底极光 + 顶部流动烟雾

## 目录结构

```
wechat-ordering-menu/
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── config.js             # 订阅消息模板 ID
│   ├── custom-tab-bar/       # 自定义底部导航（菜单/心情/陪伴）
│   └── pages/
│       ├── index/            # 菜单 + 点菜 + 结算 + 下单抽屉
│       ├── orders/           # 订单（当前单 + 历史）
│       ├── wishlist/         # 心愿单
│       ├── mood/             # 心情
│       ├── companion/        # 陪伴
│       └── admin/            # 管家面板
├── cloudfunctions/           # 8 个云函数
│   ├── login/ getMenu/ initData/ createOrder/
│   └── getOrders/ updateOrderStatus/ wishlist/ sendNotify/
├── project.config.json
└── preview.html              # UI 原型（浏览器直接打开可交互预览）
```

## UI 配色

| 用途 | 色值 |
|---|---|
| 背景 | `#FAFAFC` 冷白 |
| 玻璃卡片 | `rgba(255,255,255,0.78)` |
| 主色（iOS 蓝） | `#007AFF` / `#0062CC` |
| 粉色点缀 | `#FF7EB6` / `#FF6F91` |
| 文字 | `#1C1C1E` / `rgba(60,60,67,0.6)` |

## 部署（一次性）

1. **导入**：微信开发者工具导入 `wechat-ordering-menu` 目录
2. **AppID**：`project.config.json` → `appid` 改成你的（无则先注册 [mp.weixin.qq.com](https://mp.weixin.qq.com)）
3. **云开发**：开通后把环境 ID 填进 `miniprogram/app.js` 的 `env`
4. **部署云函数**：`cloudfunctions/` 下每个云函数右键上传部署（共 8 个）
5. **建集合**：数据库建 `dishes` / `orders` / `wishes` / `users`（权限：仅创建者可读写）
6. **初始化菜单**：云开发控制台跑 `initData` 云函数，写入 12 道默认菜
7. **配管家**：预览运行一次拿 openid，填入云函数环境变量 `ADMIN_OPENIDS`（login、getOrders、updateOrderStatus、wishlist、sendNotify），重新部署

配置完，菜单页右上角会出现「👑 管家」入口。

## 可选：订阅消息

1. 公众平台 → 订阅消息 → 选订单类模板，复制模板 ID
2. 填入 `miniprogram/config.js` 的 `TEMPLATE_ID` 和 `sendNotify` 云函数环境变量
3. 发布前把 `sendNotify` 里的 `miniprogramState` 改成 `'formal'`

## 修改菜单

- 云开发控制台 → `dishes` 集合直接增删改
- 或改 `cloudfunctions/initData` 的 `DEFAULT_DISHES`，清空集合后重跑
- 加图片：上传云存储，给 dish 加 `image` 字段存 fileID
