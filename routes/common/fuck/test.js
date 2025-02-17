const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'common/fuck/test';
})

module.exports = router;

