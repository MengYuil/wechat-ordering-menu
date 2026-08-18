const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { status, skip = 0, limit = 20, orderId } = event
  const adminList = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean)
  const isAdmin = adminList.includes(OPENID)

  if (orderId) {
    const order = await db.collection('orders').doc(orderId).get()
    if (!order.data) throw new Error('订单不存在')
    if (!isAdmin && order.data.createdBy !== OPENID) throw new Error('无权限')
    return { list: [order.data], isAdmin }
  }

  let where = {}
  if (!isAdmin) {
    where.createdBy = OPENID
  }
  if (status && status !== 'all') {
    if (Array.isArray(status)) {
      where.status = _.in(status)
    } else {
      where.status = status
    }
  }

  const res = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return { list: res.data, isAdmin }
}
