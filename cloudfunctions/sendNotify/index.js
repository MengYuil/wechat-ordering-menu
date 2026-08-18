const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { orderNo, total, itemNames, remark } = event
  const adminList = (process.env.ADMIN_OPENIDS || '').split(',').filter(Boolean)
  const templateId = process.env.TEMPLATE_ID

  if (!templateId) return { sent: false, reason: '未配置 TEMPLATE_ID' }
  if (!adminList.length) return { sent: false, reason: '未配置 ADMIN_OPENIDS' }

  const now = new Date()
  const pad = n => (n < 10 ? '0' + n : '' + n)
  const timeStr = `${now.getMonth() + 1}-${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}`

  const summary = (itemNames || '').slice(0, 20) || '有新订单啦'
  const page = 'pages/orders/orders'

  let result
  try {
    result = await cloud.openapi.subscribeMessage.send({
      touser: adminList[0],
      page,
      lang: 'zh_CN',
      data: {
        thing1: { value: summary },
        time2: { value: timeStr },
        thing3: { value: (remark || '快来接单啦~').slice(0, 20) }
      },
      templateId,
      miniprogramState: 'developer'
    })
    return { sent: true, result }
  } catch (err) {
    return { sent: false, errCode: err.errCode, errMsg: err.errMsg, reason: '订阅消息发送失败' }
  }
}
