const { default: axios } = require('axios');
const { githubToken } = require('../utils/config');

const router = require('koa-router')(); //引入并实例化

const dataBase = {
  visitor: {}
}

initVisitorsData();

// 今日访问量查询
router.get('/', async (ctx) => {
  const ip = getClientIP(ctx.request)
  try {
    const { visitor: body } = dataBase
    // const body = JSON.parse(data.body)
    const result = {
      total: (body.total || 0) + 1,
      today: Object.keys(body[new Date().toLocaleDateString()] || {}).length,
      visitorTime: body[new Date().toLocaleDateString()]?.[ip] || 0,
    }
    body[new Date().toLocaleDateString()] || (body[new Date().toLocaleDateString()] = { [ip]: 1 })
    body.total = (body.total || 0) + (body[new Date().toLocaleDateString()]?.[ip] ? 0 : 1)
    await axios({
      url: 'https://api.github.com/repos/mirrows/mirrows.github.io/issues/1',
      method: 'PATCH',
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: githubToken,
      },
      data: { body: JSON.stringify(body) }
    })
    ctx.body = {
      code: 0,
      data: result,
      ip,
    };
  } catch (err) {
    ctx.body = {
      code: 500,
      msg: err
    }
  }
})

// 统计当天访问量
router.post('/', async (ctx) => {
  const ip = getClientIP(ctx.request)
  const { time = 1 } = JSON.parse(ctx.request.body)
  try {
    const { visitor: body } = dataBase
    // const body = JSON.parse(data.body)
    body[new Date().toLocaleDateString()] || (body[new Date().toLocaleDateString()] = {})
    body[new Date().toLocaleDateString()][ip] = (body[new Date().toLocaleDateString()][ip] || 0) + time
    console.log(body)
    await axios({
      url: 'https://api.github.com/repos/mirrows/mirrows.github.io/issues/1',
      method: 'PATCH',
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: githubToken,
      },
      data: { body: JSON.stringify(body) }
    })
    ctx.body = {
      code: 0,
      msg: 'success',
    }
  } catch (err) {
    console.log(666)
    ctx.body = {
      code: 500,
      msg: err
    }
  }
})

async function initVisitorsData() {
  const { data } = await axios.get('https://api.github.com/repos/mirrows/mirrows.github.io/issues/1', {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken,
    },
  })
  dataBase.visitor = JSON.parse(data.body)
}

function getClientIP(req) {
  let ip = req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
    req.ip ||
    req.connection?.remoteAddress || // 判断 connection 的远程 IP
    req.socket?.remoteAddress || // 判断后端的 socket 的 IP
    req.connection?.socket?.remoteAddress || ''
  if (ip) {
    ip = ip.replace('::ffff:', '')
  }
  return ip;
}

module.exports = router;

