const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const adminList = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean)
  const role = adminList.includes(OPENID) ? 'admin' : 'girlfriend'

  const users = db.collection('users')
  const existed = await users.where({ openid: OPENID }).get()
  const data = {
    openid: OPENID,
    role,
    nickname: event.nickname || '',
    avatar: event.avatar || '',
    lastLoginAt: db.serverDate()
  }
  if (existed.data.length === 0) {
    await users.add({ data: { ...data, createdAt: db.serverDate() } })
  } else {
    await users.doc(existed.data[0]._id).update({ data })
  }

  return { openid: OPENID, role }
}
