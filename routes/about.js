const router = require('koa-router')(); //引入并实例化
const { githubToken, gUser } = require('../utils/config');
const { req } = require('../utils/req');

// router.get('/', ctx => {
//   ctx.body = 'about me';
// })

router.get('/', async (ctx) => {
  const { data } = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/2`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  })
  ctx.body = {
    code: 0,
    data,
  }
})


module.exports = router;

