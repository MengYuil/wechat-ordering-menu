const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_DISHES = [
  { name: '番茄炒蛋面', emoji: '🍜', price: 18, category: '主食', desc: '酸甜开胃，暖胃又暖心', sort: 1 },
  { name: '可乐鸡翅饭', emoji: '🍗', price: 22, category: '主食', desc: '甜甜的可乐裹着嫩鸡翅', sort: 2 },
  { name: '红烧肉配饭', emoji: '🥘', price: 28, category: '主食', desc: '肥而不腻，入口即化', sort: 3 },
  { name: '虾仁滑蛋饭', emoji: '🍤', price: 26, category: '主食', desc: '滑嫩鸡蛋遇上弹弹虾仁', sort: 4 },
  { name: '草莓小蛋糕', emoji: '🍰', price: 15, category: '甜品', desc: '软fufu，甜到心里', sort: 5 },
  { name: '红豆双皮奶', emoji: '🥛', price: 12, category: '甜品', desc: '奶香浓郁，红豆绵密', sort: 6 },
  { name: '蜂蜜柚子茶', emoji: '🍯', price: 10, category: '饮品', desc: '清新润喉，暖暖的', sort: 7 },
  { name: '珍珠奶茶', emoji: '🧋', price: 12, category: '饮品', desc: '波霸多多，快乐加倍', sort: 8 },
  { name: '热巧克力', emoji: '☕', price: 14, category: '饮品', desc: '浓郁丝滑，治愈系', sort: 9 },
  { name: '香辣烤串', emoji: '🍢', price: 20, category: '夜宵', desc: '滋滋冒油，小心烫嘴', sort: 10 },
  { name: '蒜蓉小龙虾', emoji: '🦞', price: 45, category: '夜宵', desc: '红彤彤的一大盘', sort: 11 },
  { name: '黄金炸鸡', emoji: '🍗', price: 25, category: '夜宵', desc: '外酥里嫩，一口爆汁', sort: 12 }
]

exports.main = async () => {
  const countRes = await db.collection('dishes').count()
  if (countRes.total > 0) {
    return { done: false, reason: '菜单已存在，未重复初始化', total: countRes.total }
  }
  const tasks = DEFAULT_DISHES.map(d =>
    db.collection('dishes').add({ data: { ...d, available: true, createdAt: db.serverDate() } })
  )
  await Promise.all(tasks)
  return { done: true, inserted: DEFAULT_DISHES.length }
}
