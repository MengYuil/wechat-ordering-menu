const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, content, wishId } = event
  const col = db.collection('wishes')
  const adminList = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean)
  const isAdmin = adminList.includes(OPENID)

  switch (action) {
    case 'add': {
      const text = (content || '').trim()
      if (!text) throw new Error('写点心愿内容呀')
      const res = await col.add({
        data: { content: text, status: 'open', createdBy: OPENID, createdAt: db.serverDate() }
      })
      return { _id: res._id }
    }
    case 'list': {
      const where = isAdmin ? {} : { createdBy: OPENID }
      const res = await col.where(where).orderBy('createdAt', 'desc').get()
      return { list: res.data }
    }
    case 'remove': {
      const w = await col.doc(wishId).get()
      if (!w.data || w.data.createdBy !== OPENID) throw new Error('无权限')
      await col.doc(wishId).remove()
      return { ok: true }
    }
    case 'grant': {
      const w = await col.doc(wishId).get()
      if (!w.data) throw new Error('心愿不存在')
      if (!isAdmin) throw new Error('只有专属管家可以帮你实现心愿哦')
      await col.doc(wishId).update({ data: { status: 'granted', grantedAt: db.serverDate() } })
      return { ok: true }
    }
    default:
      throw new Error('未知操作')
  }
}
