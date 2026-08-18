const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const res = await db.collection('dishes')
    .where({ available: true })
    .orderBy('sort', 'asc')
    .get()
  return { list: res.data }
}
