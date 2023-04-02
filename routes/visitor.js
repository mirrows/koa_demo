const router = require('koa-router')(); //引入并实例化

// 今日访问量查询
router.get('/', ctx => {
  console.log(ctx.request.ip, ctx.request.headers['x-forwarded-for'], ctx.ip)
  ctx.body = {
    code: 0,
    data: { ip: [ctx.request.headers['x-forwarded-for'], ctx.request.ip, ctx.ip] }
  };
})

// 统计当天访问量
router.post('/', ctx => {
  ctx.body = 'about me';
})

module.exports = router;

