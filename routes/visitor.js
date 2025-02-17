const { mongoUri, dbName } = require('../utils/config');
const router = require('koa-router')(); //引入并实例化
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = mongoUri;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const dataBase = {
  visitor: {}
}

// 今日访问量查询
router.get('/', async (ctx) => {
  const { ip } = ctx.request.query
  const date = new Date().toLocaleDateString()
  const cl = client.db(dbName).collection('ips')
  const curIp = await cl.findOne({ip, date})
  if(!curIp) {
    await cl.insertOne({ip, date, time: 1})
  }
  const total = await cl.countDocuments()
  const curTotal = await cl.countDocuments({date})
  ctx.body = {
    code: 0,
    data: {
      total,
      today: curTotal,
      visitorTime: curIp?.time || 0
    },
    ip,
  };
  // const { data } = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/1`, {
  //   headers: {
  //     Accept: "application/vnd.github+json",
  //     Authorization: githubToken,
  //   },
  // })
  // try {
  //   const dataBaseBody = JSON.parse(data.body)
  //   dataBase.visitor = {
  //     ...dataBaseBody,
  //     ...dataBase.visitor,
  //     [today]: {
  //       [ip]: 1,
  //       ...combainObj(dataBaseBody[today], dataBase.visitor[today]),
  //     },
  //     total: Math.max((dataBase.visitor.total || 0), (dataBaseBody.total || 0), 0) + (dataBaseBody[today]?.[ip] || dataBase.visitor[today]?.[ip] ? 0 : 1)
  //   }
  //   const result = {
  //     total: (dataBase.visitor.total || 0),
  //     today: Object.keys(dataBase.visitor[today] || {}).length,
  //     visitorTime: dataBase.visitor[today]?.[ip] || 0,
  //   }
  //   await req({
  //     url: `https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/1`,
  //     method: 'PATCH',
  //     headers: {
  //       Accept: "application/vnd.github+json",
  //       Authorization: githubToken,
  //     },
  //     data: { body: JSON.stringify(dataBase.visitor) }
  //   })
  //   ctx.body = {
  //     code: 0,
  //     data: result,
  //     ip,
  //   };
  // } catch (err) {
  //   console.log(err)
  //   ctx.body = {
  //     code: 500,
  //     msg: String(err)
  //   }
  // }
})

// 统计当天访问量
router.post('/', async (ctx) => {
  const { time = 1, ip } = ctx.request.body
  const date = new Date().toLocaleDateString()
  const cl = client.db(dbName).collection("ips")
  const curIp = await cl.findOne({ip, date})
  if(!curIp) {
    await cl.insertOne({ip, date, time})
  } else {
    await cl.updateOne({ip, date}, {$inc: {time}})
  }
  const data = await cl.find().toArray()
  ctx.body = {
    code: 0,
    msg: 'success',
    data,
  }
  // const { data } = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/1`, {
  //   headers: {
  //     Accept: "application/vnd.github+json",
  //     Authorization: githubToken,
  //   },
  // })
  // try {
  //   const dataBaseBody = JSON.parse(data.body)
  //   dataBase.visitor = {
  //     ...dataBaseBody,
  //     ...dataBase.visitor,
  //     [today]: {
  //       ...combainObj(dataBaseBody[today], dataBase.visitor[today]),
  //       [ip]: (Math.max(dataBase.visitor[today]?.[ip] || 0, dataBaseBody[today]?.[ip]) || 0) + time
  //     },
  //   }
  //   await req({
  //     url: `https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/1`,
  //     method: 'PATCH',
  //     headers: {
  //       Accept: "application/vnd.github+json",
  //       Authorization: githubToken,
  //     },
  //     data: { body: JSON.stringify(dataBase.visitor) }
  //   })
  //   ctx.body = {
  //     code: 0,
  //     msg: 'success',
  //   }
  // } catch (err) {
  //   console.log(err)
  //   ctx.body = {
  //     code: 500,
  //     msg: String(err)
  //   }
  // }
})

function combainObj(obj1 = {}, obj2 = {}) {
  const obj = {}
  Object.keys({ ...obj1, ...obj2 }).forEach(key => {
    obj[key] = Math.max(obj1[key] || 1, obj2[key] || 1)
  })
  return obj
}

function getClientIP(req) {
  console.log(
    req.headers['x-forwarded-for'],
    req.ip,
    req.connection?.remoteAddress,
    req.socket?.remoteAddress,
    req.connection?.socket?.remoteAddress
  )
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

