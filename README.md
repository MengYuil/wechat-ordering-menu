# 情侣生活 · 微信小程序

给女朋友点餐 + 情侣日常工具：她点菜你接单，还有心愿单、心情打卡、陪伴互动。

**技术栈**：微信小程序 + 微信云开发（免费额度，情侣单用户够用）。

## 功能

🎨 液态玻璃设计：白底极光光斑 + iOS 蓝 #007AFF + 玻璃卡片 + 顶部流动烟雾胶囊

🍽️ 菜单页：按时间段问候、分类胶囊（主食/甜品/饮品/夜宵）、12 道菜真实数据、加菜白球飞入动画、底部结算条、支付抽屉

💛 心情页：6 种心情网格 + 记录时间线 + 本周小结

🫂 陪伴页：「想你了」大按钮飘心 + 早安/晚安 + 互动记录

📖 订单页：今晚这单（增减/附言）+ 历史订单 + 取消/催单

🌟 心愿单：记心愿 + 实现/删除

👑 管家页：接单/完成

## 目录结构

```
dcapp-v2/
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── config.js             # 订阅消息模板 ID
│   ├── custom-tab-bar/       # 自定义底部导航（菜单/心情/陪伴）
│   └── pages/
│       ├── index/            # 菜单 + 点菜 + 结算条 + 下单抽屉
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
| 背景 | `#FAF6F0` 燕麦暖白 |
| 卡片 | `#FFFFFF` |
| 主色（珊瑚） | `#E8614F` / `#D14E3C` |
| 粉色点缀 | `#FF7EB6` / `#FF9DBB` / `#FF6F91` |
| 文字 | `#241E19` / `#8A817A` |
| 边框/淡米 | `#EAE2D9` / `#F4EDE5` |

## 部署步骤（一次性）

### 1. 导入项目
微信开发者工具 → 导入 → 选择 `dcapp-v2` 目录。

### 2. 填 AppID
`project.config.json` → `appid` 改成你的小程序 AppID（现在是 `touristappid` 占位）。

> 没有 AppID 先去 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册，个人主体免费。

### 3. 开通云开发 + 填环境 ID
1. 开发者工具点「云开发」开通，创建免费环境，复制**环境 ID**
2. 打开 `miniprogram/app.js`，把 `env` 填上环境 ID（留空则用默认环境）

### 4. 部署云函数
对 `cloudfunctions/` 下**每个**云函数右键 → 上传并部署（云端安装依赖）。共 8 个：login、getMenu、initData、createOrder、getOrders、updateOrderStatus、wishlist、sendNotify。

### 5. 建数据库集合
云开发控制台 → 数据库 → 创建 4 个集合（权限选「仅创建者可读写」）：
- `dishes`（菜品）
- `orders`（订单）
- `wishes`（心愿）
- `users`（用户）

### 6. 初始化菜单
云开发控制台 → 云函数 → 选 `initData` → 运行测试 → 点运行，写入 12 道默认菜。

### 7. 配置管家身份（ADMIN_OPENIDS）
1. 先在手机上预览运行一次（触发 `login` 云函数）
2. 云开发控制台 → 数据库 → `users` 集合里能看到自己的 openid
3. 把它填到这些云函数的**环境变量 `ADMIN_OPENIDS`**（多个用英文逗号分隔）：
   - `login`、`getOrders`、`updateOrderStatus`、`wishlist`、`sendNotify`
4. 重新部署这几个云函数

配置完，你打开小程序菜单页右上角会多一个「👑管家」入口。

## 可选：订阅消息（下单通知你）

1. 公众平台 → 功能 → 订阅消息 → 选「订单类」模板，复制模板 ID
2. 填入 `miniprogram/config.js` 的 `TEMPLATE_ID` 和 `sendNotify` 云函数环境变量
3. 正式发布前把 `sendNotify/index.js` 里的 `miniprogramState: 'developer'` 改成 `'formal'`

## 修改菜单

- 方式一：云开发控制台 → `dishes` 集合直接增删改
- 方式二：改 `cloudfunctions/initData` 的 `DEFAULT_DISHES`，清空集合后重跑
- 加图片：上传云存储，给 dish 记录加 `image` 字段存 fileID

