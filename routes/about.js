const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'about me';
})

router.post('/awake', (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'service has been awaked'
  }
})

module.exports = router;

