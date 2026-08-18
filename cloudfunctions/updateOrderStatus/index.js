const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { orderId, action } = event
  const adminList = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean)
  const isAdmin = adminList.includes(OPENID)

  if (!orderId) throw new Error('缺少订单ID')
  const order = await db.collection('orders').doc(orderId).get()
  const data = order.data
  if (!data) throw new Error('订单不存在')

  const now = db.serverDate()
  const updates = { updatedAt: now }

  switch (action) {
    case 'accept':
      if (!isAdmin) throw new Error('只有专属管家可以接单哦')
      if (data.status !== 'pending') throw new Error('订单状态已变化')
      updates.status = 'cooking'
      updates.acceptedAt = now
      break
    case 'done':
      if (!isAdmin) throw new Error('只有专属管家可以操作哦')
      if (data.status !== 'cooking') throw new Error('只有制作中的订单可以标记完成')
      updates.status = 'done'
      updates.doneAt = now
      break
    case 'cancel':
      if (!isAdmin && data.createdBy !== OPENID) throw new Error('无权限')
      if (data.status !== 'pending') throw new Error('只有待接单的订单可以取消')
      updates.status = 'cancelled'
      break
    case 'poke':
      if (data.createdBy !== OPENID) throw new Error('无权限')
      if (data.status !== 'cooking') throw new Error('只有制作中才能催单哦')
      updates.pokeCount = (data.pokeCount || 0) + 1
      break
    default:
      throw new Error('未知操作')
  }

  await db.collection('orders').doc(orderId).update({ data: updates })
  return { ok: true, status: updates.status, pokeCount: updates.pokeCount }
}
