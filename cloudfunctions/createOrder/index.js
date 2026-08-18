const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { items = [], remark = '' } = event

  if (!items.length) throw new Error('购物车是空的哦')
  const cleanItems = items.filter(i => i && i.dishId && i.price > 0 && i.count > 0)
  if (!cleanItems.length) throw new Error('没有可下单的商品')

  const total = cleanItems.reduce((s, i) => s + i.price * i.count, 0)
  const orderNo = 'D' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 899 + 100)
  const now = db.serverDate()

  const doc = {
    orderNo,
    items: cleanItems,
    remark: (remark || '').trim(),
    total,
    status: 'pending',
    pokeCount: 0,
    createdBy: OPENID,
    createdAt: now,
    updatedAt: now
  }
  const res = await db.collection('orders').add({ data: doc })
  return { _id: res._id, orderNo, total }
}
