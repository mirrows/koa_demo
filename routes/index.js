const { req } = require('../utils/req');

const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.post('/awake', (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'service has been awaked'
  }
})

router.get('/bing', async ctx => {
  const { n = 1 } = ctx.request.query
  const { status, data } = await req.get('https://bing.com/HPImageArchive.aspx', {
    params: { format: 'js', n },
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      data: data.images.map(msg => ({ ...msg, url: `https://bing.com${msg.url}` }))
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/ip', async (ctx) => {
  const { data } = await req.get('https://ip.useragentinfo.com/json').catch(err => {
    console.log(err)
  })
  console.log(data)
  ctx.body = {
    code: 0,
    data,
  }
})

module.exports = router;

